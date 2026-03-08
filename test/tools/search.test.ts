import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@flowrag/provider-local', () => ({
  LocalEmbedder: class {
    readonly modelName = 'test';
    readonly dimensions = 3;
    async embed() {
      return [0.1, 0.2, 0.3];
    }
    async embedBatch(texts: string[]) {
      return texts.map(() => [0.1, 0.2, 0.3]);
    }
  },
}));

vi.mock('@flowrag/provider-gemini', () => ({
  GeminiExtractor: class {
    readonly modelName = 'test';
    async extractEntities() {
      return { entities: [], relations: [] };
    }
  },
}));

import { createEchoesRAG } from '../../lib/rag/index.js';
import { search } from '../../lib/tools/search.js';

describe('search', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-search-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedArc(arc: string) {
    const { storage } = createEchoesRAG({ dbPath, arc });

    // Seed chapter vectors
    await storage.vector.upsert([
      {
        id: 'chunk:ch1',
        vector: [0.1, 0.2, 0.3],
        metadata: {
          _kind: 'chunk',
          documentId: 'doc:ch1',
          content: 'Alice went to the airport to meet Bob',
          arc,
          episode: '1',
          chapter: '1',
          pov: 'Alice',
          title: 'The Arrival',
          location: 'Airport',
          word_count: '8',
        },
      },
      {
        id: 'chunk:ch2',
        vector: [0.1, 0.2, 0.3],
        metadata: {
          _kind: 'chunk',
          documentId: 'doc:ch2',
          content: 'The restaurant served delicious pasta',
          arc,
          episode: '1',
          chapter: '2',
          pov: 'Bob',
          title: 'Dinner',
          location: 'Restaurant',
          word_count: '5',
        },
      },
    ]);

    // Seed entity vectors
    await storage.vector.upsert([
      {
        id: 'entity:Alice',
        vector: [0.1, 0.2, 0.3],
        metadata: {
          _kind: 'entity',
          entityId: 'Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'A young woman',
        },
      },
      {
        id: 'entity:Rome',
        vector: [0.1, 0.2, 0.3],
        metadata: {
          _kind: 'entity',
          entityId: 'Rome',
          name: 'Rome',
          type: 'LOCATION',
          description: 'A city',
        },
      },
    ]);

    // Seed graph
    await storage.graph.addEntity({
      id: 'Alice',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'A young woman',
      sourceChunkIds: ['chunk:ch1'],
    });
    await storage.graph.addEntity({
      id: 'Rome',
      name: 'Rome',
      type: 'LOCATION',
      description: 'A city',
      sourceChunkIds: ['chunk:ch1'],
    });
    await storage.graph.addRelation({
      id: 'Alice-LOVES-Bob',
      sourceId: 'Alice',
      targetId: 'Rome',
      type: 'LIVES_IN',
      description: 'Alice lives in Rome',
      keywords: [],
      sourceChunkIds: ['chunk:ch1'],
    });
  }

  describe('chapters', () => {
    it('searches chapters by semantic similarity', async () => {
      await seedArc('bloom');

      const result = await search({ query: 'airport', type: 'chapters', arc: 'bloom', dbPath });

      expect(result.type).toBe('chapters');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('pov');
      expect(result.results[0]).toHaveProperty('score');
    });

    it('filters by arc', async () => {
      await seedArc('bloom');
      await seedArc('work');

      const result = await search({ query: 'airport', type: 'chapters', arc: 'bloom', dbPath });

      for (const r of result.results) {
        expect(r.arc).toBe('bloom');
      }
    });

    it('respects limit', async () => {
      await seedArc('bloom');

      const result = await search({
        query: 'test',
        type: 'chapters',
        arc: 'bloom',
        limit: 1,
        dbPath,
      });

      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('truncates long content', async () => {
      const { storage } = createEchoesRAG({ dbPath, arc: 'trunc' });
      const longContent = 'word '.repeat(200);
      await storage.vector.upsert([
        {
          id: 'chunk:long',
          vector: [0.1, 0.2, 0.3],
          metadata: {
            _kind: 'chunk',
            documentId: 'doc:long',
            content: longContent,
            arc: 'trunc',
            episode: '1',
            chapter: '1',
            pov: 'X',
            title: 'T',
            location: '',
            word_count: '200',
          },
        },
      ]);

      const result = await search({ query: 'word', type: 'chapters', arc: 'trunc', dbPath });

      expect(result.results[0].content.length).toBeLessThan(600);
      expect(result.results[0].content.endsWith('...')).toBe(true);
    });
  });

  describe('entities', () => {
    it('searches entities by semantic similarity', async () => {
      await seedArc('bloom');

      const result = await search({ query: 'woman', type: 'entities', arc: 'bloom', dbPath });

      expect(result.type).toBe('entities');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('name');
      expect(result.results[0]).toHaveProperty('score');
    });

    it('filters by entity type', async () => {
      await seedArc('bloom');

      const result = await search({
        query: 'test',
        type: 'entities',
        arc: 'bloom',
        entityType: 'LOCATION',
        dbPath,
      });

      for (const r of result.results) {
        expect(r.type).toBe('LOCATION');
      }
    });
  });

  describe('relations', () => {
    it('searches relations by text match', async () => {
      await seedArc('bloom');

      const result = await search({ query: 'Alice', type: 'relations', arc: 'bloom', dbPath });

      expect(result.type).toBe('relations');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('source_entity');
      expect(result.results[0]).toHaveProperty('target_entity');
    });

    it('matches on description', async () => {
      await seedArc('bloom');

      const result = await search({ query: 'Rome', type: 'relations', arc: 'bloom', dbPath });

      expect(result.results.length).toBeGreaterThan(0);
    });

    it('respects limit', async () => {
      await seedArc('bloom');

      const result = await search({
        query: 'Alice',
        type: 'relations',
        arc: 'bloom',
        limit: 1,
        dbPath,
      });

      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('filters by relation type', async () => {
      await seedArc('bloom');

      const result = await search({
        query: 'Alice',
        type: 'relations',
        arc: 'bloom',
        relationType: 'LOVES',
        dbPath,
      });

      for (const r of result.results) {
        expect(r.type).toBe('LOVES');
      }
    });
  });
});
