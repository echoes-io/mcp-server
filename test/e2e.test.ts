/**
 * End-to-end test using real fixture files.
 *
 * Uses:
 * - Real markdown files from test/fixtures/content
 * - Mocked embedding model and Gemini API
 * - Real FlowRAG storage (LanceDB, SQLite, JSON KV)
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@flowrag/provider-local', () => ({
  LocalEmbedder: class {
    readonly modelName = 'test';
    readonly dimensions = 3;
    async embed(text: string) {
      // Simple deterministic embedding based on content
      const lower = text.toLowerCase();
      const vec = [0, 0, 0];
      for (let i = 0; i < lower.length; i++) vec[i % 3] += lower.charCodeAt(i);
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    }
    async embedBatch(texts: string[]) {
      return Promise.all(texts.map((t) => this.embed(t)));
    }
  },
}));

vi.mock('@flowrag/provider-gemini', () => ({
  GeminiExtractor: class {
    readonly modelName = 'test';
    async extractEntities(content: string) {
      const entities: Array<{ name: string; type: string; description: string }> = [];
      const relations: Array<{
        source: string;
        target: string;
        type: string;
        description: string;
        keywords: string[];
      }> = [];

      if (content.includes('Nic'))
        entities.push({ name: 'Nic', type: 'CHARACTER', description: 'The protagonist' });
      if (content.includes('Alice'))
        entities.push({
          name: 'Alice',
          type: 'CHARACTER',
          description: 'A young woman with red hair',
        });
      if (content.includes('Marco'))
        entities.push({ name: 'Marco', type: 'CHARACTER', description: 'Restaurant owner' });
      if (content.includes('Malpensa'))
        entities.push({
          name: 'Aeroporto di Malpensa',
          type: 'LOCATION',
          description: 'Milan airport',
        });
      if (content.includes('ristorante') || content.includes('Ristorante'))
        entities.push({
          name: 'Ristorante Da Marco',
          type: 'LOCATION',
          description: "Marco's restaurant",
        });

      if (content.includes('Alice') && content.includes('Nic'))
        relations.push({
          source: 'Alice',
          target: 'Nic',
          type: 'LOVES',
          description: 'Alice has feelings for Nic',
          keywords: ['love'],
        });
      if (content.includes('Marco') && content.includes('Alice'))
        relations.push({
          source: 'Marco',
          target: 'Alice',
          type: 'RELATED_TO',
          description: 'Marco is like a brother',
          keywords: ['family'],
        });

      return { entities, relations };
    }
  },
}));

import { index } from '../lib/tools/index.js';
import { search } from '../lib/tools/search.js';
import { stats } from '../lib/tools/stats.js';
import { wordsCount } from '../lib/tools/words-count.js';

const FIXTURES_PATH = join(__dirname, 'fixtures', 'content');

describe('e2e', () => {
  let dbPath: string;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-e2e-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  describe('words-count', () => {
    it('counts words in real fixture file', () => {
      const filePath = join(FIXTURES_PATH, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
      const result = wordsCount({ filePath, detailed: true });

      expect(result.words).toBeGreaterThan(100);
      expect(result.words).toBeLessThan(200);
      expect(result.paragraphs).toBeGreaterThan(3);
      expect(result.sentences).toBeGreaterThan(5);
    });
  });

  describe('index', () => {
    it('indexes real fixture files', async () => {
      const result = await index({ contentPath: FIXTURES_PATH, dbPath });

      expect(result.indexed).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.entities).toBeGreaterThan(0);
      expect(result.relations).toBeGreaterThan(0);
    });

    it('performs incremental indexing', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await index({ contentPath: FIXTURES_PATH, dbPath });

      expect(result.indexed).toBe(0);
      expect(result.skipped).toBe(3);
    });
  });

  describe('stats', () => {
    it('returns statistics from indexed fixtures', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await stats({ dbPath });

      expect(result.totalChapters).toBe(3);
      expect(result.arcs).toEqual(['bloom']);
      expect(result.povs).toEqual({ nic: 2, alice: 1 });
      expect(result.totalWords).toBeGreaterThan(400);
      expect(result.averageWordsPerChapter).toBeGreaterThan(100);
    });

    it('filters by POV', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await stats({ pov: 'nic', dbPath });

      expect(result.totalChapters).toBe(2);
      expect(result.povs).toEqual({ nic: 2 });
    });
  });

  describe('search', () => {
    it('finds chapters by semantic query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'aeroporto arrivo volo', type: 'chapters', dbPath });

      expect(result.type).toBe('chapters');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].id).toBeDefined();
    });

    it('finds entities by semantic query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({
        query: 'persona capelli rossi',
        type: 'entities',
        arc: 'bloom',
        dbPath,
      });

      expect(result.type).toBe('entities');
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('finds relations by text query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'Alice', type: 'relations', dbPath });

      expect(result.type).toBe('relations');
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('filters search by arc', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'incontro', type: 'chapters', arc: 'bloom', dbPath });

      expect(result.results.every((c) => c.arc === 'bloom')).toBe(true);
    });
  });
});
