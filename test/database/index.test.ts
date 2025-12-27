import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Database } from '../../lib/database/index.js';
import type { ChapterRecord, EntityRecord, RelationRecord } from '../../lib/database/schemas.js';
import { generateEmbedding, resetExtractor } from '../../lib/indexer/embeddings.js';
import { getPackageConfig } from '../../lib/utils.js';

// Use a small, fast model for tests
const TEST_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

describe('Database', () => {
  let tempDir: string;
  let dbPath: string;

  beforeAll(async () => {
    // Pre-load model to cache it
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-db-test-'));
    dbPath = join(tempDir, 'db');
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    resetExtractor();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
    vi.restoreAllMocks();
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  describe('initialization', () => {
    it('creates metadata file on first connect', async () => {
      const db = new Database(dbPath);
      await db.connect();

      const metadataPath = join(dbPath, 'metadata.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      expect(metadata.version).toBe(getPackageConfig().version);
      expect(metadata.embeddingModel).toBe(TEST_MODEL);
      expect(metadata.embeddingDim).toBe(EMBEDDING_DIM);
    });

    it('auto-detects embedding dimension from model', async () => {
      const db = new Database(dbPath);
      await db.connect();

      expect(db.embeddingDim).toBe(EMBEDDING_DIM);
    });

    it('exposes embedding config via getters after connect', async () => {
      const db = new Database(dbPath);
      await db.connect();

      expect(db.embeddingModel).toBe(TEST_MODEL);
      expect(db.embeddingDim).toBe(EMBEDDING_DIM);
    });

    it('throws when accessing getters before connect', () => {
      const db = new Database(dbPath);

      expect(() => db.embeddingModel).toThrow('Database not connected');
      expect(() => db.embeddingDim).toThrow('Database not connected');
    });

    it('detects version mismatch and clears tables', async () => {
      mkdirSync(dbPath, { recursive: true });
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(
        metadataPath,
        JSON.stringify({
          version: '0.0.1',
          embeddingModel: TEST_MODEL,
          embeddingDim: EMBEDDING_DIM,
        }),
      );

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));

      const db = new Database(dbPath);
      await db.connect();

      expect(logs.some((l) => l.includes('config changed'))).toBe(true);
      expect(logs.some((l) => l.includes('version'))).toBe(true);
    });

    it('detects model mismatch and clears tables', async () => {
      mkdirSync(dbPath, { recursive: true });
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(
        metadataPath,
        JSON.stringify({
          version: getPackageConfig().version,
          embeddingModel: 'old/model',
          embeddingDim: EMBEDDING_DIM,
        }),
      );

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));

      const db = new Database(dbPath);
      await db.connect();

      expect(logs.some((l) => l.includes('config changed'))).toBe(true);
      expect(logs.some((l) => l.includes('model'))).toBe(true);
    });

    it('detects dimension mismatch and clears tables', async () => {
      mkdirSync(dbPath, { recursive: true });
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(
        metadataPath,
        JSON.stringify({
          version: getPackageConfig().version,
          embeddingModel: TEST_MODEL,
          embeddingDim: 768,
        }),
      );

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));

      const db = new Database(dbPath);
      await db.connect();

      expect(logs.some((l) => l.includes('config changed'))).toBe(true);
      expect(logs.some((l) => l.includes('dimension'))).toBe(true);
    });

    it('keeps database when all config matches', async () => {
      mkdirSync(dbPath, { recursive: true });
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(
        metadataPath,
        JSON.stringify({
          version: getPackageConfig().version,
          embeddingModel: TEST_MODEL,
          embeddingDim: EMBEDDING_DIM,
        }),
      );

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));

      const db = new Database(dbPath);
      await db.connect();

      expect(logs.some((l) => l.includes('config changed'))).toBe(false);
    });

    it('drops existing tables on config mismatch', async () => {
      // First, create a database with some data
      const db1 = new Database(dbPath);
      await db1.upsertChapters([
        {
          id: 'arc1:1:1',
          file_path: 'test.md',
          file_hash: 'hash',
          arc: 'arc1',
          episode: 1,
          chapter: 1,
          pov: 'Alice',
          title: 'Test',
          location: '',
          date: '',
          content: 'Test',
          summary: '',
          word_count: 1,
          char_count: 4,
          paragraph_count: 1,
          vector: Array(EMBEDDING_DIM).fill(0),
          entities: [],
          indexed_at: Date.now(),
        },
      ]);
      db1.close();

      // Now change the version in metadata
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(
        metadataPath,
        JSON.stringify({
          version: '0.0.1',
          embeddingModel: TEST_MODEL,
          embeddingDim: EMBEDDING_DIM,
        }),
      );

      // Connect again - should drop tables
      const db2 = new Database(dbPath);
      await db2.connect();

      // Table should be empty after migration
      const hashes = await db2.getChapterHashes();
      expect(hashes.size).toBe(0);
    });

    it('handles corrupted metadata file', async () => {
      mkdirSync(dbPath, { recursive: true });
      const metadataPath = join(dbPath, 'metadata.json');
      writeFileSync(metadataPath, 'not valid json');

      const db = new Database(dbPath);
      await db.connect();

      // Should have recreated metadata
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      expect(metadata.version).toBe(getPackageConfig().version);
    });
  });

  describe('chapters', () => {
    const createChapter = (id: string): ChapterRecord => ({
      id,
      file_path: `content/${id}.md`,
      file_hash: `hash_${id}`,
      arc: 'arc1',
      episode: 1,
      chapter: 1,
      pov: 'Alice',
      title: 'Test Chapter',
      location: '',
      date: '',
      content: 'Test content',
      summary: '',
      word_count: 10,
      char_count: 50,
      paragraph_count: 1,
      vector: Array(EMBEDDING_DIM).fill(0),
      entities: [],
      indexed_at: Date.now(),
    });

    it('upserts chapters', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertChapters([createChapter('arc1:1:1')]);

      expect(count).toBe(1);
    });

    it('returns 0 for empty array', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertChapters([]);

      expect(count).toBe(0);
    });

    it('updates existing chapter via mergeInsert', async () => {
      const db = new Database(dbPath);
      const chapter = createChapter('arc1:1:1');

      await db.upsertChapters([chapter]);
      await db.upsertChapters([{ ...chapter, title: 'Updated Title' }]);

      const hashes = await db.getChapterHashes();
      expect(hashes.size).toBe(1);
    });

    it('gets chapter hashes', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([createChapter('arc1:1:1'), createChapter('arc1:1:2')]);

      const hashes = await db.getChapterHashes();

      expect(hashes.size).toBe(2);
      expect(hashes.get('content/arc1:1:1.md')).toBe('hash_arc1:1:1');
    });

    it('returns empty map when no chapters', async () => {
      const db = new Database(dbPath);

      const hashes = await db.getChapterHashes();

      expect(hashes.size).toBe(0);
    });

    it('deletes chapters by paths', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([createChapter('arc1:1:1'), createChapter('arc1:1:2')]);

      const deleted = await db.deleteChaptersByPaths(['content/arc1:1:1.md']);

      expect(deleted).toBe(1);

      const hashes = await db.getChapterHashes();
      expect(hashes.size).toBe(1);
    });

    it('returns 0 when deleting empty paths', async () => {
      const db = new Database(dbPath);

      const deleted = await db.deleteChaptersByPaths([]);

      expect(deleted).toBe(0);
    });

    it('gets chapters for stats', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([
        { ...createChapter('arc1:1:1'), arc: 'bloom', pov: 'Alice', word_count: 100 },
        { ...createChapter('arc1:1:2'), arc: 'bloom', pov: 'Bob', word_count: 200 },
        { ...createChapter('arc1:1:3'), arc: 'work', pov: 'Alice', word_count: 150 },
      ]);

      const all = await db.getChapters();
      expect(all).toHaveLength(3);

      const filtered = await db.getChapters('bloom');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((c) => c.arc === 'bloom')).toBe(true);
    });

    it('returns empty array when no chapters', async () => {
      const db = new Database(dbPath);

      const chapters = await db.getChapters();

      expect(chapters).toHaveLength(0);
    });
  });

  describe('entities', () => {
    const createEntity = (id: string): EntityRecord => ({
      id,
      arc: 'arc1',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'Test entity',
      aliases: [],
      vector: Array(EMBEDDING_DIM).fill(0),
      chapters: [],
      chapter_count: 0,
      first_appearance: '',
      indexed_at: Date.now(),
    });

    it('upserts entities', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertEntities([createEntity('arc1:CHARACTER:Alice')]);

      expect(count).toBe(1);
    });

    it('returns 0 for empty array', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertEntities([]);

      expect(count).toBe(0);
    });

    it('gets entities with filters', async () => {
      const db = new Database(dbPath);
      await db.upsertEntities([
        { ...createEntity('bloom:CHARACTER:Alice'), arc: 'bloom', type: 'CHARACTER' },
        { ...createEntity('bloom:LOCATION:Rome'), arc: 'bloom', type: 'LOCATION' },
        { ...createEntity('work:CHARACTER:Bob'), arc: 'work', type: 'CHARACTER' },
      ]);

      const all = await db.getEntities();
      expect(all).toHaveLength(3);

      const byArc = await db.getEntities('bloom');
      expect(byArc).toHaveLength(2);

      const byType = await db.getEntities(undefined, 'CHARACTER');
      expect(byType).toHaveLength(2);

      const byBoth = await db.getEntities('bloom', 'CHARACTER');
      expect(byBoth).toHaveLength(1);
    });
  });

  describe('relations', () => {
    const createRelation = (id: string): RelationRecord => ({
      id,
      arc: 'arc1',
      source_entity: 'arc1:CHARACTER:Alice',
      target_entity: 'arc1:CHARACTER:Bob',
      type: 'LOVES',
      description: 'Test relation',
      weight: 0.5,
      chapters: [],
      indexed_at: Date.now(),
    });

    it('upserts relations', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertRelations([createRelation('arc1:Alice:LOVES:Bob')]);

      expect(count).toBe(1);
    });

    it('returns 0 for empty array', async () => {
      const db = new Database(dbPath);

      const count = await db.upsertRelations([]);

      expect(count).toBe(0);
    });

    it('gets relations with filters', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        { ...createRelation('bloom:A:LOVES:B'), arc: 'bloom', type: 'LOVES' },
        { ...createRelation('bloom:A:KNOWS:C'), arc: 'bloom', type: 'KNOWS' },
        { ...createRelation('work:A:LOVES:D'), arc: 'work', type: 'LOVES' },
      ]);

      const all = await db.getRelations();
      expect(all).toHaveLength(3);

      const byArc = await db.getRelations('bloom');
      expect(byArc).toHaveLength(2);

      const byType = await db.getRelations(undefined, 'LOVES');
      expect(byType).toHaveLength(2);

      const byBoth = await db.getRelations('bloom', 'LOVES');
      expect(byBoth).toHaveLength(1);
    });
  });

  describe('close', () => {
    it('closes database connection', async () => {
      const db = new Database(dbPath);
      await db.connect();

      db.close();

      // Should be able to reconnect
      await db.connect();
    });

    it('reopens existing tables after close', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([
        {
          id: 'arc1:1:1',
          file_path: 'test.md',
          file_hash: 'hash',
          arc: 'arc1',
          episode: 1,
          chapter: 1,
          pov: 'Alice',
          title: 'Test',
          location: '',
          date: '',
          content: 'Test',
          summary: '',
          word_count: 1,
          char_count: 4,
          paragraph_count: 1,
          vector: Array(EMBEDDING_DIM).fill(0),
          entities: [],
          indexed_at: Date.now(),
        },
      ]);

      db.close();

      // Reopen and verify data persists
      const hashes = await db.getChapterHashes();
      expect(hashes.size).toBe(1);
    });
  });
});
