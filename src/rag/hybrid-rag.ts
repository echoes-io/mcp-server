/**
 * Hybrid RAG System
 * Combines GraphRAG (primary) with sqlite-vec (fallback) for maximum reliability
 */

import type { DatabaseType } from '../database/index.js';
import { VectorStore } from '../database/vector.js';
import { type ChapterRecord, DatabaseSync } from './database-sync.js';
import {
  createEmbeddingProvider,
  type EmbeddingConfig,
  type EmbeddingProvider,
} from './embeddings.js';
import { type GraphChunk, GraphRAG } from './graph-rag.js';

export interface HybridRAGConfig {
  embedding: EmbeddingConfig;
  graphRAG: {
    threshold: number;
    randomWalkSteps: number;
    restartProb: number;
  };
  fallback: {
    enabled: boolean;
    timeout: number; // ms
  };
}

export interface SearchOptions {
  topK?: number;
  characters?: string[];
  allCharacters?: boolean;
  arc?: string;
  pov?: string;
  useGraphRAG?: boolean;
}

export interface SearchResult {
  id: string;
  chapterId: string;
  content: string;
  characters: string[];
  metadata: Record<string, unknown>;
  score: number;
  source: 'graphrag' | 'vector';
}

export class HybridRAG {
  private graphRAG: GraphRAG;
  private vectorStore: VectorStore;
  private embedder: EmbeddingProvider;
  private dbSync: DatabaseSync;
  private config: HybridRAGConfig;
  private isGraphReady: boolean = false;

  constructor(db: DatabaseType, config: HybridRAGConfig) {
    this.config = config;
    this.embedder = createEmbeddingProvider(config.embedding);
    this.graphRAG = new GraphRAG(this.embedder.dimension, config.graphRAG.threshold);
    this.vectorStore = new VectorStore(db);
    this.dbSync = new DatabaseSync(db);
  }

  /**
   * Index chapters into both GraphRAG and vector store
   */
  async indexChapters(
    chapters: Array<{
      id: string;
      content: string;
      characters: string[];
      metadata: {
        chapterId: string;
        arc: string;
        episode: number;
        chapter: number;
        pov: string;
        location?: string;
        timeline?: string;
        title?: string;
        summary?: string;
        filePath?: string;
        [key: string]: unknown;
      };
    }>,
  ): Promise<{
    graphNodes: number;
    vectorEmbeddings: number;
    dbSync: { timelines: number; arcs: number; episodes: number; chapters: number };
  }> {
    if (chapters.length === 0) {
      return {
        graphNodes: 0,
        vectorEmbeddings: 0,
        dbSync: { timelines: 0, arcs: 0, episodes: 0, chapters: 0 },
      };
    }

    try {
      // 1. Sync database first - ensure all timeline/arc/episode/chapter records exist
      const chapterRecords: ChapterRecord[] = chapters.map((ch) => ({
        chapterId: ch.metadata.chapterId,
        timeline: ch.metadata.timeline || 'default',
        arc: ch.metadata.arc,
        episode: ch.metadata.episode,
        chapter: ch.metadata.chapter,
        pov: ch.metadata.pov,
        title: ch.metadata.title,
        summary: ch.metadata.summary,
        location: ch.metadata.location,
        filePath: ch.metadata.filePath,
      }));

      const syncStats = await this.dbSync.syncChapters(chapterRecords);

      // 2. Generate embeddings for all chapters
      const texts = chapters.map((ch) => ch.content);
      const embeddings = await this.embedder.embed(texts);

      // 3. Index into GraphRAG
      const chunks: GraphChunk[] = chapters.map((ch, _i) => ({
        text: ch.content,
        metadata: {
          ...ch.metadata,
          characters: ch.characters,
          timeline: ch.metadata.timeline || 'default',
        },
      }));

      const graphEmbeddings = embeddings.map((emb) => ({ vector: emb }));

      this.graphRAG.clear();
      this.graphRAG.createGraph(chunks, graphEmbeddings);
      this.isGraphReady = true;

      // 4. Index into vector store (fallback) - get real chapter IDs from database
      let vectorCount = 0;
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const realChapterId = await this.dbSync.getChapterId(
          ch.metadata.timeline || 'default',
          ch.metadata.arc,
          ch.metadata.episode,
          ch.metadata.chapter,
        );

        if (realChapterId) {
          await this.vectorStore.insert(
            realChapterId,
            ch.content,
            new Float32Array(embeddings[i]),
            ch.characters,
            ch.metadata,
          );
          vectorCount++;
        } else {
          console.warn(`Could not find database ID for chapter ${ch.metadata.chapterId}`);
        }
      }

      return {
        graphNodes: chunks.length,
        vectorEmbeddings: vectorCount,
        dbSync: syncStats,
      };
    } catch (error) {
      console.error('Failed to index chapters:', error);
      throw error;
    }
  }

  /**
   * Search using hybrid approach: GraphRAG first, vector fallback
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { topK = 10, characters, allCharacters = false, arc, pov, useGraphRAG = true } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.embedder.embedSingle(query);

      // Try GraphRAG first (if enabled and ready)
      if (useGraphRAG && this.isGraphReady && this.config.fallback.enabled) {
        try {
          const graphResults = await Promise.race([
            this.searchWithGraphRAG(queryEmbedding, {
              topK,
              characters,
              allCharacters,
              arc,
              pov,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('GraphRAG timeout')), this.config.fallback.timeout),
            ),
          ]);

          if (graphResults.length > 0) {
            return graphResults.map((result) => ({
              ...result,
              source: 'graphrag' as const,
            }));
          }
        } catch (error) {
          console.warn('GraphRAG failed, falling back to vector search:', error);
        }
      }

      // Fallback to vector search
      return await this.searchWithVector(queryEmbedding, {
        topK,
        characters,
        allCharacters,
        arc,
        pov,
      });
    } catch (error) {
      console.error('Hybrid search failed:', error);
      throw error;
    }
  }

  private async searchWithGraphRAG(
    queryEmbedding: number[],
    options: Omit<SearchOptions, 'useGraphRAG'>,
  ): Promise<SearchResult[]> {
    const results = this.graphRAG.query({
      query: queryEmbedding,
      topK: options.topK,
      randomWalkSteps: this.config.graphRAG.randomWalkSteps,
      restartProb: this.config.graphRAG.restartProb,
      characters: options.characters,
      allCharacters: options.allCharacters,
      arc: options.arc,
      pov: options.pov,
    });

    return results.map((result) => ({
      id: result.id,
      chapterId: result.metadata.chapterId,
      content: result.content,
      characters: result.metadata.characters,
      metadata: result.metadata,
      score: result.score,
      source: 'graphrag' as const,
    }));
  }

  private async searchWithVector(
    queryEmbedding: number[],
    options: Omit<SearchOptions, 'useGraphRAG'>,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.vectorStore.search(new Float32Array(queryEmbedding), {
        characters: options.characters,
        allCharacters: options.allCharacters,
        limit: options.topK || 10,
      });

      return results.map((result) => ({
        id: result.id,
        chapterId: result.chapterId,
        content: result.content,
        characters: result.characters,
        metadata: result.metadata,
        score: result.similarity,
        source: 'vector' as const,
      }));
    } catch (error) {
      console.warn('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Get characters that co-occur with a specific character
   */
  async getCoOccurringCharacters(character: string): Promise<string[]> {
    try {
      // Try GraphRAG approach first
      if (this.isGraphReady) {
        const nodes = this.graphRAG.getNodes();
        const coOccurring = new Set<string>();

        nodes.forEach((node) => {
          if (node.metadata.characters.includes(character)) {
            node.metadata.characters.forEach((char) => {
              if (char !== character) {
                coOccurring.add(char);
              }
            });
          }
        });

        if (coOccurring.size > 0) {
          return Array.from(coOccurring).sort();
        }
      }

      // Fallback to vector store
      return await this.vectorStore.getCharacters(character);
    } catch (error) {
      console.error('Failed to get co-occurring characters:', error);
      return [];
    }
  }

  /**
   * Get system status and statistics
   */
  getStatus(): {
    graphRAG: { ready: boolean; nodes: number; edges: number };
    vectorStore: { ready: boolean };
    embedder: { name: string; dimension: number };
  } {
    return {
      graphRAG: {
        ready: this.isGraphReady,
        nodes: this.graphRAG.getNodes().length,
        edges: this.graphRAG.getEdges().length,
      },
      vectorStore: {
        ready: true, // Vector store is always ready if DB is available
      },
      embedder: {
        name: this.embedder.name,
        dimension: this.embedder.dimension,
      },
    };
  }

  /**
   * Clear all indexes
   */
  async clear(): Promise<void> {
    this.graphRAG.clear();
    this.isGraphReady = false;
    // Note: Vector store clearing would require database operations
    // This is handled at the database level
  }
}

/**
 * Default configuration for hybrid RAG
 */
export const DEFAULT_HYBRID_CONFIG: HybridRAGConfig = {
  embedding: {
    provider: 'bge-base',
    batchSize: 32,
    maxTokens: 512,
  },
  graphRAG: {
    threshold: 0.8, // Higher threshold for more selective connections
    randomWalkSteps: 100,
    restartProb: 0.15,
  },
  fallback: {
    enabled: true,
    timeout: 5000, // 5 seconds
  },
};
