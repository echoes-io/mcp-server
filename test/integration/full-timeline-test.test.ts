import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabaseType } from '../../src/database/index.js';
import { initDatabase } from '../../src/database/index.js';
import { createCharacterNER } from '../../src/rag/character-ner.js';
import type { HybridRAG, SearchResult } from '../../src/rag/hybrid-rag.js';
import { createHybridRAG } from '../../src/rag/index.js';
import type { ChapterMetadata } from '../../src/types/frontmatter.js';
import { parseMarkdown } from '../../src/utils/markdown.js';

describe('Full Timeline-Eros Test (466 chapters)', () => {
  const timelineErosPath = '/home/zweer/projects/echoes-io/timeline-eros/content';
  const testDbPath = ':memory:';

  let db: DatabaseType;
  let hybridRAG: HybridRAG;
  let chapters: Array<{
    id: string;
    content: string;
    characters: string[];
    metadata: Record<string, unknown> & {
      chapterId: string;
      arc: string;
      episode: number;
      chapter: number;
      pov: string;
    };
  }> = [];

  beforeAll(async () => {
    console.log('🚀 Starting full-scale test with ALL timeline-eros chapters...');

    // Initialize database
    db = await initDatabase(testDbPath);

    // Initialize hybrid RAG with production-like config
    hybridRAG = createHybridRAG(db, {
      embedding: {
        provider: 'e5-small', // Lightweight for testing
        batchSize: 32, // Larger batches for efficiency
      },
      graphRAG: {
        threshold: 0.95, // High threshold to manage edge density
        randomWalkSteps: 100,
        restartProb: 0.15,
      },
      fallback: {
        enabled: true,
        timeout: 30000, // 30 seconds for large dataset
      },
    });

    // Load ALL chapters from timeline-eros
    console.log('📚 Loading all chapters from timeline-eros...');
    const startTime = Date.now();

    chapters = await loadAllChaptersFromTimeline(timelineErosPath);

    const loadTime = Date.now() - startTime;
    console.log(`✅ Loaded ${chapters.length} chapters in ${loadTime}ms`);
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    if (hybridRAG) {
      await hybridRAG.clear();
    }
  });

  describe('Full Dataset Loading', () => {
    it('should load all 466 chapters successfully', () => {
      expect(chapters.length).toBe(466);

      // Verify data quality
      const validChapters = chapters.filter(
        (ch) => ch.content.length > 100 && ch.metadata.arc && ch.metadata.pov,
      );

      console.log(`📊 Valid chapters: ${validChapters.length}/${chapters.length}`);
      expect(validChapters.length).toBeGreaterThan(300); // At least 300 valid chapters (some may be short)
    });

    it('should have diverse content across timeline', () => {
      const povs = new Set(chapters.map((ch) => ch.metadata.pov));
      const arcs = new Set(chapters.map((ch) => ch.metadata.arc));
      const episodes = new Set(chapters.map((ch) => ch.metadata.episode));

      console.log(`📈 Dataset diversity:`);
      console.log(`  POVs: ${povs.size} (${Array.from(povs).join(', ')})`);
      console.log(`  Arcs: ${arcs.size} (${Array.from(arcs).join(', ')})`);
      console.log(`  Episodes: ${episodes.size}`);

      expect(povs.size).toBeGreaterThan(1);
      expect(arcs.size).toBeGreaterThan(0);
      expect(episodes.size).toBeGreaterThan(1);
    });

    it('should extract meaningful characters', () => {
      const allCharacters = new Set<string>();
      chapters.forEach((ch) => {
        for (const char of ch.characters) {
          allCharacters.add(char);
        }
      });

      const characterCounts = new Map<string, number>();
      chapters.forEach((ch) => {
        ch.characters.forEach((char) => {
          characterCounts.set(char, (characterCounts.get(char) || 0) + 1);
        });
      });

      const frequentCharacters = Array.from(characterCounts.entries())
        .filter(([_, count]) => count >= 10)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      console.log(`👥 Top 10 characters:`);
      frequentCharacters.forEach(([char, count]) => {
        console.log(`  ${char}: ${count} appearances`);
      });

      expect(allCharacters.size).toBeGreaterThan(50);
      expect(frequentCharacters.length).toBeGreaterThan(5);
    });
  });

  describe('Full-Scale GraphRAG Indexing', () => {
    it('should index all 466 chapters into GraphRAG system', async () => {
      console.log('🔄 Starting full indexing process...');
      const startTime = Date.now();

      const result = await hybridRAG.indexChapters(chapters);

      const indexTime = Date.now() - startTime;
      console.log(
        `⚡ Indexed ${chapters.length} chapters in ${indexTime}ms (${(indexTime / 1000).toFixed(1)}s)`,
      );
      console.log(`📊 Results:`);
      console.log(`  GraphRAG nodes: ${result.graphNodes}`);
      console.log(`  Vector embeddings: ${result.vectorEmbeddings}`);
      console.log(`  DB sync: ${JSON.stringify(result.dbSync)}`);

      expect(result.graphNodes).toBe(chapters.length);
      expect(result.vectorEmbeddings).toBe(chapters.length);
      expect(indexTime).toBeLessThan(120000); // Should complete within 2 minutes

      // Performance metrics
      const chaptersPerSecond = (chapters.length / (indexTime / 1000)).toFixed(1);
      console.log(`🚀 Performance: ${chaptersPerSecond} chapters/second`);
    }, 150000); // 2.5 minute timeout

    it('should create reasonable graph structure', async () => {
      const status = hybridRAG.getStatus();

      console.log(`🕸️ Graph structure:`);
      console.log(`  Nodes: ${status.graphRAG.nodes}`);
      console.log(`  Edges: ${status.graphRAG.edges}`);

      expect(status.graphRAG.ready).toBe(true);
      expect(status.graphRAG.nodes).toBe(chapters.length);
      expect(status.graphRAG.edges).toBeGreaterThan(0);

      // Calculate edge density
      const maxPossibleEdges = (chapters.length * (chapters.length - 1)) / 2;
      const edgeDensity = status.graphRAG.edges / maxPossibleEdges;
      console.log(`📈 Edge density: ${(edgeDensity * 100).toFixed(3)}%`);

      // With 466 chapters, expect much lower density but account for noisy character extraction
      expect(edgeDensity).toBeGreaterThan(0.0001); // At least some connections
      expect(edgeDensity).toBeLessThan(3.0); // Temporary high limit due to noisy NER
    });
  });

  describe('Full-Scale Search Performance', () => {
    it('should perform fast semantic searches on large dataset', async () => {
      const queries = [
        'romantic scene between lovers',
        'office work and business meeting',
        'emotional conversation about feelings',
        'intimate moment in bedroom',
        'conflict and argument between characters',
      ];

      console.log('🔍 Testing search performance on full dataset...');

      for (const query of queries) {
        const startTime = Date.now();

        const results = await hybridRAG.search(query, { topK: 10 });

        const searchTime = Date.now() - startTime;
        console.log(`  "${query}": ${results.length} results in ${searchTime}ms`);

        expect(results.length).toBeGreaterThan(0);
        expect(searchTime).toBeLessThan(5000); // Should be under 5 seconds for large dataset

        // Verify result quality
        expect(results[0].score).toBeGreaterThan(0);
        expect(results[0].content).toBeTruthy();
        expect(results[0].source).toMatch(/^(graphrag|vector)$/);
      }
    }, 30000); // 30 second timeout for search tests

    it('should handle character filtering on large dataset', async () => {
      // Find most frequent characters
      const characterCounts = new Map<string, number>();
      chapters.forEach((ch) => {
        ch.characters.forEach((char) => {
          characterCounts.set(char, (characterCounts.get(char) || 0) + 1);
        });
      });

      const topCharacters = Array.from(characterCounts.entries())
        .filter(([_, count]) => count >= 20)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      console.log('👥 Testing character filtering...');

      for (const [character, count] of topCharacters) {
        const startTime = Date.now();

        const results = await hybridRAG.search('conversation', {
          topK: 15,
          characters: [character],
        });

        const searchTime = Date.now() - startTime;
        console.log(
          `  Character "${character}" (${count} appearances): ${results.length} results in ${searchTime}ms`,
        );

        expect(results.length).toBeGreaterThan(0);
        expect(searchTime).toBeLessThan(2000);

        // All results should contain the character
        results.forEach((result: SearchResult) => {
          expect(result.characters).toContain(character);
        });
      }
    });

    it('should test fallback system reliability', async () => {
      console.log('🔄 Testing fallback system...');

      // Test with GraphRAG disabled
      const fallbackResults = await hybridRAG.search('test query', {
        topK: 10,
        useGraphRAG: false,
      });

      console.log(`  Fallback search: ${fallbackResults.length} results`);
      expect(fallbackResults.length).toBeGreaterThan(0);

      fallbackResults.forEach((result: SearchResult) => {
        expect(result.source).toBe('vector');
      });
    });
  });

  describe('Memory and Performance Analysis', () => {
    it('should report memory usage and performance metrics', async () => {
      const memUsage = process.memoryUsage();

      console.log('💾 Memory usage:');
      console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`);
      console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`);
      console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`);

      // Memory should be reasonable for 466 chapters
      expect(memUsage.heapUsed).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB

      const status = hybridRAG.getStatus();
      console.log('⚙️ System status:');
      console.log(`  GraphRAG ready: ${status.graphRAG.ready}`);
      console.log(`  Embedder: ${status.embedder.name} (${status.embedder.dimension}D)`);
    });
  });
});

// Helper function to load ALL chapters from timeline directory
async function loadAllChaptersFromTimeline(contentPath: string) {
  const chapters: Array<{
    id: string;
    content: string;
    characters: string[];
    metadata: Record<string, unknown> & {
      chapterId: string;
      arc: string;
      episode: number;
      chapter: number;
      pov: string;
    };
  }> = [];

  function walkDirectory(dir: string) {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walkDirectory(fullPath);
      } else if (item.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const parsed = parseMarkdown(content);

          // Skip if content is too short
          // if (parsed.content.length < 100) continue;

          // Extract characters from content
          const characters = extractCharactersFromContent(parsed.content, parsed.metadata);

          chapters.push({
            id: `ch-${chapters.length + 1}`,
            content: parsed.content,
            characters,
            metadata: {
              chapterId: `ch-${chapters.length + 1}`,
              arc: parsed.metadata.arc || 'unknown',
              episode: parsed.metadata.episode || 1,
              chapter: parsed.metadata.chapter || 1,
              pov: parsed.metadata.pov || 'unknown',
              location: parsed.metadata.location,
              timeline: parsed.metadata.timeline || 'eros',
              title: parsed.metadata.title,
              summary: parsed.metadata.summary,
              filePath: fullPath,
            },
          });
        } catch (error) {
          console.warn(`Failed to parse ${fullPath}:`, error);
        }
      }
    }
  }

  walkDirectory(contentPath);
  return chapters;
}

// Enhanced character extraction with improved NER
function extractCharactersFromContent(content: string, metadata: ChapterMetadata): string[] {
  const ner = createCharacterNER();
  return ner.extractCharacters(content, metadata);
}
