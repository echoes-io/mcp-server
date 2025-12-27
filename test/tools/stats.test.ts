import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Use a small, fast model for tests
import { TEST_EMBEDDING_MODEL } from '../../lib/constants.js';
import { Database } from '../../lib/database/index.js';
import type { ChapterRecord } from '../../lib/database/schemas.js';
import { generateEmbedding, resetExtractor } from '../../lib/indexer/embeddings.js';
import { stats } from '../../lib/tools/stats.js';

const TEST_MODEL = TEST_EMBEDDING_MODEL;
const EMBEDDING_DIM = 384;

describe('stats', () => {
  let tempDir: string;
  let dbPath: string;

  beforeAll(async () => {
    // Pre-load model to cache it
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-stats-test-'));
    dbPath = join(tempDir, 'db');
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    resetExtractor();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  const createChapter = (
    arc: string,
    episode: number,
    chapter: number,
    pov: string,
    wordCount: number,
  ): ChapterRecord => ({
    id: `${arc}:${episode}:${chapter}`,
    file_path: `${arc}/ep${episode}/ch${chapter}.md`,
    file_hash: 'hash',
    arc,
    episode,
    chapter,
    pov,
    title: 'Test',
    location: '',
    date: '',
    content: 'Test',
    summary: '',
    word_count: wordCount,
    char_count: 100,
    paragraph_count: 1,
    vector: Array(EMBEDDING_DIM).fill(0),
    entities: [],
    indexed_at: Date.now(),
  });

  it('returns aggregate statistics', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('bloom', 1, 2, 'Bob', 2000),
      createChapter('work', 1, 1, 'Alice', 1500),
    ]);
    db.close();

    const result = await stats({ dbPath });

    expect(result.totalChapters).toBe(3);
    expect(result.totalWords).toBe(4500);
    expect(result.arcs).toEqual(['bloom', 'work']);
    expect(result.povs).toEqual({ alice: 2, bob: 1 });
    expect(result.averageWordsPerChapter).toBe(1500);
  });

  it('filters by arc', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('work', 1, 1, 'Bob', 2000),
    ]);
    db.close();

    const result = await stats({ arc: 'bloom', dbPath });

    expect(result.totalChapters).toBe(1);
    expect(result.arcs).toEqual(['bloom']);
  });

  it('filters by multiple arcs', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('work', 1, 1, 'Bob', 2000),
      createChapter('other', 1, 1, 'Carol', 500),
    ]);
    db.close();

    const result = await stats({ arc: 'bloom, work', dbPath });

    expect(result.totalChapters).toBe(2);
    expect(result.arcs).toEqual(['bloom', 'work']);
  });

  it('filters by pov', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('bloom', 1, 2, 'Bob', 2000),
    ]);
    db.close();

    const result = await stats({ pov: 'Alice', dbPath });

    expect(result.totalChapters).toBe(1);
    expect(result.povs).toEqual({ alice: 1 });
  });

  it('normalizes POV to lowercase', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('bloom', 1, 2, 'alice', 2000),
      createChapter('bloom', 1, 3, 'ALICE', 500),
    ]);
    db.close();

    const result = await stats({ dbPath });

    expect(result.povs).toEqual({ alice: 3 });
  });

  it('filters by multiple povs', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([
      createChapter('bloom', 1, 1, 'Alice', 1000),
      createChapter('bloom', 1, 2, 'Bob', 2000),
      createChapter('bloom', 1, 3, 'Carol', 500),
    ]);
    db.close();

    const result = await stats({ pov: 'alice, bob', dbPath });

    expect(result.totalChapters).toBe(2);
  });

  it('throws error when no chapters indexed', async () => {
    await expect(stats({ dbPath })).rejects.toThrow('No indexed chapters found');
  });

  it('throws error when arc not found', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([createChapter('bloom', 1, 1, 'Alice', 1000)]);
    db.close();

    await expect(stats({ arc: 'unknown', dbPath })).rejects.toThrow('No chapters found for arc');
  });

  it('throws error when pov not found', async () => {
    const db = new Database(dbPath);
    await db.upsertChapters([createChapter('bloom', 1, 1, 'Alice', 1000)]);
    db.close();

    await expect(stats({ pov: 'Unknown', dbPath })).rejects.toThrow('No chapters found for POV');
  });
});
