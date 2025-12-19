import { beforeAll, describe, expect, it } from 'vitest';

import type { DatabaseType } from '../../src/database/index.js';
import { initDatabase } from '../../src/database/index.js';
import { HybridRAG } from '../../src/rag/hybrid-rag.js';

describe('HybridRAG', () => {
  let db: DatabaseType;
  let hybridRAG: HybridRAG;

  beforeAll(async () => {
    db = await initDatabase(':memory:');
    hybridRAG = new HybridRAG(db, {
      embedding: { provider: 'e5-small' },
      graphRAG: {
        threshold: 0.8,
        randomWalkSteps: 3,
        restartProb: 0.15,
      },
      fallback: { enabled: true, timeout: 5000 },
    });
  });

  describe('indexChapters', () => {
    it('should handle empty chapters array', async () => {
      const result = await hybridRAG.indexChapters([]);
      expect(result.graphNodes).toBe(0);
      expect(result.vectorEmbeddings).toBe(0);
      expect(result.dbSync.chapters).toBe(0);
    });

    it('should index single chapter', async () => {
      const chapters = [
        {
          id: 'test-ch1',
          content: 'This is a test chapter with some content.',
          characters: ['Alice', 'Bob'],
          metadata: {
            chapterId: 'test-ch1',
            timeline: 'test-timeline',
            arc: 'test-arc',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
          },
        },
      ];

      const result = await hybridRAG.indexChapters(chapters);
      expect(result.graphNodes).toBe(1);
      expect(result.vectorEmbeddings).toBe(1);
      expect(result.dbSync.chapters).toBe(1);
    });
  });

  describe('search', () => {
    beforeAll(async () => {
      // Index some test data
      const chapters = [
        {
          id: 'ch1',
          content: 'Alice and Bob are having a romantic conversation in the garden.',
          characters: ['Alice', 'Bob'],
          metadata: {
            chapterId: 'ch1',
            timeline: 'test',
            arc: 'romance',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
          },
        },
        {
          id: 'ch2',
          content: 'Charlie is working in the office on a business project.',
          characters: ['Charlie'],
          metadata: {
            chapterId: 'ch2',
            timeline: 'test',
            arc: 'work',
            episode: 1,
            chapter: 2,
            pov: 'Charlie',
          },
        },
      ];

      await hybridRAG.indexChapters(chapters);
    });

    it('should search with default options', async () => {
      const results = await hybridRAG.search('romantic conversation');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('source');
    });

    it('should search with character filter', async () => {
      const results = await hybridRAG.search('conversation', {
        characters: ['Alice'],
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.characters).toContain('Alice');
      });
    });

    it('should use vector fallback when GraphRAG is disabled', async () => {
      const results = await hybridRAG.search('conversation', {
        useGraphRAG: false,
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.source).toBe('vector');
      });
    });
  });
});
