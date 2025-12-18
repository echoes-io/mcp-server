/**
 * RAG Module - GraphRAG + Vector Search for Echoes
 *
 * Provides hybrid search capabilities combining:
 * - GraphRAG: Semantic relationships, character connections, temporal sequences
 * - Vector Search: Fast similarity search with sqlite-vec fallback
 */

// Embedding providers
export {
  BGEBaseEmbedding,
  batchArray,
  cosineSimilarity,
  createEmbeddingProvider,
  E5SmallEmbedding,
  type EmbeddingConfig,
  type EmbeddingProvider,
  GeminiEmbedding,
  normalizeEmbedding,
} from './embeddings.js';
// Core GraphRAG implementation
export {
  type GraphChunk,
  type GraphEdge,
  type GraphEmbedding,
  type GraphNode,
  GraphRAG,
  type RankedNode,
  type SupportedEdgeType,
} from './graph-rag.js';
// Hybrid RAG system
export {
  DEFAULT_HYBRID_CONFIG,
  HybridRAG,
  type HybridRAGConfig,
  type SearchOptions,
  type SearchResult,
} from './hybrid-rag.js';

/**
 * Quick setup function for common use cases
 */
import type { DatabaseType } from '../database/index.js';
import { DEFAULT_HYBRID_CONFIG, HybridRAG, type HybridRAGConfig } from './hybrid-rag.js';

export function createHybridRAG(
  db: DatabaseType,
  config: Partial<HybridRAGConfig> = {},
): HybridRAG {
  const fullConfig: HybridRAGConfig = {
    ...DEFAULT_HYBRID_CONFIG,
    ...config,
    embedding: {
      ...DEFAULT_HYBRID_CONFIG.embedding,
      ...config.embedding,
    },
    graphRAG: {
      ...DEFAULT_HYBRID_CONFIG.graphRAG,
      ...config.graphRAG,
    },
    fallback: {
      ...DEFAULT_HYBRID_CONFIG.fallback,
      ...config.fallback,
    },
  };

  return new HybridRAG(db, fullConfig);
}
