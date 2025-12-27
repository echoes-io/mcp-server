/**
 * End-to-end test using real fixture files.
 *
 * This test uses:
 * - Real markdown files from test/fixtures/content
 * - Real embedding model (Xenova/all-MiniLM-L6-v2)
 * - Real LanceDB database
 * - Mocked Gemini API (extractEntities)
 *
 * The only mock is the Gemini API to avoid external API calls and costs.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock only the Gemini API
vi.mock('../lib/indexer/extractor.js', () => ({
  extractEntities: vi.fn(async (content: string) => {
    // Simulate realistic entity extraction based on content
    const entities: Array<{
      name: string;
      type: string;
      description: string;
      aliases: string[];
    }> = [];
    const relations: Array<{
      source: string;
      target: string;
      type: string;
      description: string;
    }> = [];

    // Simple keyword-based extraction for testing
    if (content.includes('Nic')) {
      entities.push({
        name: 'Nic',
        type: 'CHARACTER',
        description: 'The protagonist',
        aliases: [],
      });
    }
    if (content.includes('Alice')) {
      entities.push({
        name: 'Alice',
        type: 'CHARACTER',
        description: 'A young woman with red hair',
        aliases: [],
      });
    }
    if (content.includes('Bob')) {
      entities.push({
        name: 'Bob',
        type: 'CHARACTER',
        description: 'A programmer friend',
        aliases: [],
      });
    }
    if (content.includes('Marco')) {
      entities.push({
        name: 'Marco',
        type: 'CHARACTER',
        description: 'Restaurant owner, like a brother to Alice',
        aliases: [],
      });
    }
    if (content.includes('Malpensa')) {
      entities.push({
        name: 'Aeroporto di Malpensa',
        type: 'LOCATION',
        description: 'Milan airport',
        aliases: ['Malpensa', 'Terminal 2'],
      });
    }
    if (content.includes('ristorante') || content.includes('Ristorante')) {
      entities.push({
        name: 'Ristorante Da Marco',
        type: 'LOCATION',
        description: "Marco's restaurant in Milan",
        aliases: ['Da Marco'],
      });
    }

    // Extract relations
    if (content.includes('Alice') && content.includes('Nic')) {
      relations.push({
        source: 'Alice',
        target: 'Nic',
        type: 'LOVES',
        description: 'Alice has feelings for Nic',
      });
    }
    if (content.includes('Bob') && content.includes('Nic')) {
      relations.push({
        source: 'Bob',
        target: 'Nic',
        type: 'FRIENDS_WITH',
        description: 'Bob and Nic are friends',
      });
    }
    if (content.includes('Marco') && content.includes('Alice')) {
      relations.push({
        source: 'Marco',
        target: 'Alice',
        type: 'RELATED_TO',
        description: 'Marco is like a brother to Alice',
      });
    }

    return { entities, relations };
  }),
}));

import { Database } from '../lib/database/index.js';
import type { ChapterRecord } from '../lib/database/schemas.js';
import { generateEmbedding, resetExtractor } from '../lib/indexer/embeddings.js';
import { scanTimeline } from '../lib/indexer/scanner.js';
import { index } from '../lib/tools/index.js';
import { type ChapterResult, type EntityResult, search } from '../lib/tools/search.js';
import { stats } from '../lib/tools/stats.js';
import { wordsCount } from '../lib/tools/words-count.js';

const FIXTURES_PATH = join(__dirname, 'fixtures', 'content');
const TEST_MODEL = 'Xenova/all-MiniLM-L6-v2';

describe('e2e', () => {
  let dbPath: string;
  let tempDir: string;

  beforeAll(async () => {
    // Pre-load embedding model
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-e2e-'));
    dbPath = join(tempDir, 'db');
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    resetExtractor();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  describe('scanner', () => {
    it('scans real fixture files', () => {
      const result = scanTimeline(FIXTURES_PATH);

      expect(result.arcs).toEqual(['bloom']);
      expect(result.chapters).toHaveLength(3);

      // Verify chapter order (sorted by arc, episode, chapter)
      expect(result.chapters[0].id).toBe('bloom:1:1');
      expect(result.chapters[1].id).toBe('bloom:1:2');
      expect(result.chapters[2].id).toBe('bloom:2:1');

      // Verify metadata extraction
      const ch1 = result.chapters[0];
      expect(ch1.pov).toBe('Nic');
      expect(ch1.title).toBe("L'arrivo");
      expect(ch1.location).toBe('Aeroporto di Malpensa');
      expect(ch1.word_count).toBeGreaterThan(100);
    });
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
    it('indexes real fixture files with embeddings', async () => {
      const result = await index({ contentPath: FIXTURES_PATH, dbPath });

      expect(result.indexed).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.entities).toBeGreaterThan(0);
      expect(result.relations).toBeGreaterThan(0);

      // Verify database contents
      const db = new Database(dbPath);
      const chapters = await db.getChapters();
      db.close();

      expect(chapters).toHaveLength(3);

      // Verify embeddings are real vectors (not zeros)
      const ch1 = chapters.find((c) => c.id === 'bloom:1:1');
      expect(ch1).toBeDefined();
      const vector = Array.from((ch1 as ChapterRecord).vector);
      expect(vector).toHaveLength(384);
      expect(vector.some((v) => v !== 0)).toBe(true);
    });

    it('performs incremental indexing', async () => {
      // First index
      await index({ contentPath: FIXTURES_PATH, dbPath });

      // Second index - should skip all
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

  describe('embeddings quality', () => {
    it('generates semantically meaningful embeddings', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const db = new Database(dbPath);
      const chapters = await db.getChapters();
      db.close();

      // Get embeddings for chapters with same location (airport)
      const airportChapters = chapters.filter((c) => c.location?.includes('Malpensa'));
      expect(airportChapters).toHaveLength(2);

      // Get embedding for restaurant chapter
      const restaurantChapter = chapters.find((c) => c.location?.includes('Marco'));
      expect(restaurantChapter).toBeDefined();

      // Calculate cosine similarity
      const cosineSim = (a: ArrayLike<number>, b: ArrayLike<number>) => {
        const arrA = Array.from(a);
        const arrB = Array.from(b);
        const dot = arrA.reduce((sum, val, i) => sum + val * arrB[i], 0);
        const normA = Math.sqrt(arrA.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(arrB.reduce((sum, val) => sum + val * val, 0));
        return dot / (normA * normB);
      };

      // Chapters at same location should be more similar to each other
      const simAirport = cosineSim(airportChapters[0].vector, airportChapters[1].vector);
      const simDifferent = cosineSim(
        airportChapters[0].vector,
        (restaurantChapter as ChapterRecord).vector,
      );

      // Airport chapters should have higher similarity than airport vs restaurant
      expect(simAirport).toBeGreaterThan(simDifferent);
    });
  });

  describe('search', () => {
    it('finds chapters by semantic query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'aeroporto arrivo volo', type: 'chapters', dbPath });

      expect(result.type).toBe('chapters');
      expect(result.results.length).toBeGreaterThan(0);
      // Should find chapters - verify we get results
      expect(result.results[0].id).toBeDefined();
    });

    it('finds entities by semantic query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'persona capelli rossi', type: 'entities', dbPath });

      expect(result.type).toBe('entities');
      expect(result.results.length).toBeGreaterThan(0);
      // Alice should be found (red hair in description)
      expect(result.results.some((e) => (e as EntityResult).name === 'Alice')).toBe(true);
    });

    it('finds relations by text query', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'Alice', type: 'relations', dbPath });

      expect(result.type).toBe('relations');
      // Should find relations involving Alice
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('filters search by arc', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'incontro', type: 'chapters', arc: 'bloom', dbPath });

      expect(result.results.every((c) => c.arc === 'bloom')).toBe(true);
    });

    it('returns relevant results ranked by similarity', async () => {
      await index({ contentPath: FIXTURES_PATH, dbPath });

      const result = await search({ query: 'ristorante cena pasta', type: 'chapters', dbPath });

      // Restaurant chapter should rank first
      expect((result.results[0] as ChapterResult).location).toContain('Marco');
      expect((result.results[0] as ChapterResult).score).toBeGreaterThan(
        (result.results[1] as ChapterResult).score,
      );
    });
  });
});
