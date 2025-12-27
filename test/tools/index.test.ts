import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock extractor only (Gemini API)
vi.mock('../../lib/indexer/extractor.js', () => ({
  extractEntities: vi.fn(() =>
    Promise.resolve({
      entities: [
        { name: 'Alice', type: 'CHARACTER', description: 'The protagonist', aliases: ['Ali'] },
      ],
      relations: [
        { source: 'Alice', target: 'Bob', type: 'KNOWS', description: 'Alice knows Bob' },
      ],
    }),
  ),
}));

// Use a small, fast model for tests
import { TEST_EMBEDDING_MODEL } from '../../lib/constants.js';
import { Database } from '../../lib/database/index.js';
import { generateEmbedding, resetExtractor } from '../../lib/indexer/embeddings.js';
import { extractEntities } from '../../lib/indexer/extractor.js';
import { index } from '../../lib/tools/index.js';

const TEST_MODEL = TEST_EMBEDDING_MODEL;

describe('index tool', () => {
  let tempDir: string;
  let contentPath: string;
  let dbPath: string;

  const createChapterFile = (arc: string, episode: number, chapter: number, pov: string) => {
    const arcDir = join(contentPath, arc, `ep0${episode}`);
    mkdirSync(arcDir, { recursive: true });

    const filePath = join(arcDir, `ch00${chapter}.md`);
    writeFileSync(
      filePath,
      `---
pov: ${pov}
title: Chapter ${chapter}
arc: ${arc}
episode: ${episode}
chapter: ${chapter}
---

This is the content of chapter ${chapter}.
`,
    );
    return filePath;
  };

  beforeAll(async () => {
    // Pre-load model to cache it
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-index-test-'));
    contentPath = join(tempDir, 'content');
    dbPath = join(tempDir, 'db');
    mkdirSync(contentPath, { recursive: true });
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    resetExtractor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  it('indexes chapters from filesystem', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');

    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.entities).toBe(1);
    expect(result.relations).toBe(1);
    expect(extractEntities).toHaveBeenCalled();
  });

  it('skips unchanged chapters on incremental index', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');

    // First index
    await index({ contentPath, dbPath });
    vi.clearAllMocks();

    // Second index - should skip
    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(extractEntities).not.toHaveBeenCalled();
  });

  it('re-indexes all chapters with force flag', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');

    // First index
    await index({ contentPath, dbPath });
    vi.clearAllMocks();

    // Second index with force
    const result = await index({ contentPath, force: true, dbPath });

    expect(result.indexed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(extractEntities).toHaveBeenCalled();
  });

  it('filters by arc', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');
    createChapterFile('work', 1, 1, 'Bob');

    const result = await index({ contentPath, arc: 'bloom', dbPath });

    expect(result.indexed).toBe(1);
  });

  it('detects deleted chapters', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');
    createChapterFile('bloom', 1, 2, 'Bob');

    // First index
    await index({ contentPath, dbPath });

    // Delete one chapter
    rmSync(join(contentPath, 'bloom', 'ep01', 'ch002.md'));

    // Second index
    const result = await index({ contentPath, dbPath });

    expect(result.deleted).toBe(1);
  });

  it('aggregates entities across chapters', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');
    createChapterFile('bloom', 1, 2, 'Alice');

    const result = await index({ contentPath, force: true, dbPath });

    // Same entity appears in both chapters, should be aggregated
    expect(result.entities).toBe(1);
  });

  it('stores chapters in database', async () => {
    createChapterFile('bloom', 1, 1, 'Alice');

    await index({ contentPath, dbPath });

    const db = new Database(dbPath);
    const chapters = await db.getChapters();
    db.close();

    expect(chapters).toHaveLength(1);
    expect(chapters[0].arc).toBe('bloom');
  });

  it('merges entity aliases from multiple chapters', async () => {
    // Mock different aliases for same entity
    vi.mocked(extractEntities)
      .mockResolvedValueOnce({
        entities: [{ name: 'Alice', type: 'CHARACTER', description: 'Desc', aliases: ['Ali'] }],
        relations: [],
      })
      .mockResolvedValueOnce({
        entities: [{ name: 'Alice', type: 'CHARACTER', description: 'Desc', aliases: ['Ally'] }],
        relations: [],
      });

    createChapterFile('bloom', 1, 1, 'Alice');
    createChapterFile('bloom', 1, 2, 'Alice');

    const result = await index({ contentPath, force: true, dbPath });

    expect(result.entities).toBe(1);
    // Both aliases should be merged
  });

  it('handles empty content directory', async () => {
    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('does not duplicate chapter in relation when same relation appears twice', async () => {
    // Mock same relation appearing twice in same chapter
    vi.mocked(extractEntities).mockResolvedValueOnce({
      entities: [],
      relations: [
        { source: 'Alice', target: 'Bob', type: 'KNOWS', description: 'Alice knows Bob' },
        { source: 'Alice', target: 'Bob', type: 'KNOWS', description: 'Alice knows Bob again' },
      ],
    });

    createChapterFile('bloom', 1, 1, 'Alice');

    const result = await index({ contentPath, dbPath });

    // Should only have 1 relation, not 2
    expect(result.relations).toBe(1);
  });
});
