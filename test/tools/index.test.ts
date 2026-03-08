import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
      return {
        entities: [{ name: 'Alice', type: 'CHARACTER', description: 'The protagonist' }],
        relations: [
          {
            source: 'Alice',
            target: 'Bob',
            type: 'KNOWS',
            description: 'Alice knows Bob',
            keywords: [],
          },
        ],
      };
    }
  },
}));

import { index } from '../../lib/tools/index.js';

describe('index tool', () => {
  let tempDir: string;
  let contentPath: string;
  let dbPath: string;

  const createChapterFile = (arc: string, episode: number, chapter: number, pov = 'Alice') => {
    const arcDir = join(contentPath, arc, `ep0${episode}`);
    mkdirSync(arcDir, { recursive: true });
    writeFileSync(
      join(arcDir, `ch00${chapter}.md`),
      `---\npov: ${pov}\ntitle: Chapter ${chapter}\narc: ${arc}\nepisode: ${episode}\nchapter: ${chapter}\n---\n\nContent of chapter ${chapter}.\n`,
    );
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-index-test-'));
    contentPath = join(tempDir, 'content');
    dbPath = join(tempDir, 'db');
    mkdirSync(contentPath, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('indexes chapters from filesystem', async () => {
    createChapterFile('bloom', 1, 1);

    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(1);
    expect(result.entities).toBeGreaterThanOrEqual(1);
    expect(result.relations).toBeGreaterThanOrEqual(1);
  });

  it('skips unchanged chapters on incremental index', async () => {
    createChapterFile('bloom', 1, 1);

    await index({ contentPath, dbPath });
    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('re-indexes all chapters with force flag', async () => {
    createChapterFile('bloom', 1, 1);

    await index({ contentPath, dbPath });
    const result = await index({ contentPath, force: true, dbPath });

    expect(result.indexed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('filters by arc', async () => {
    createChapterFile('bloom', 1, 1);
    createChapterFile('work', 1, 1);

    const result = await index({ contentPath, arc: 'bloom', dbPath });

    expect(result.indexed).toBe(1);
  });

  it('detects deleted chapters', async () => {
    createChapterFile('bloom', 1, 1);
    createChapterFile('bloom', 1, 2);

    await index({ contentPath, dbPath });
    rmSync(join(contentPath, 'bloom', 'ep01', 'ch002.md'));
    const result = await index({ contentPath, dbPath });

    expect(result.deleted).toBe(1);
  });

  it('handles empty content directory', async () => {
    const result = await index({ contentPath, dbPath });

    expect(result.indexed).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
