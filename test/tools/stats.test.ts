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
import { stats } from '../../lib/tools/stats.js';

describe('stats', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-stats-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedChapters(
    chapters: Array<{
      arc: string;
      episode: number;
      chapter: number;
      pov: string;
      wordCount: number;
    }>,
  ) {
    // Group by arc to seed into correct namespace
    const byArc = new Map<string, typeof chapters>();
    for (const ch of chapters) {
      if (!byArc.has(ch.arc)) byArc.set(ch.arc, []);
      byArc.get(ch.arc)?.push(ch);
    }

    for (const [arc, arcChapters] of byArc) {
      const { storage } = createEchoesRAG({ dbPath, arc });
      for (const ch of arcChapters) {
        const key = `doc:${ch.arc}:${ch.episode}:${ch.chapter}`;
        await storage.kv.set(key, {
          metadata: {
            fields: {
              arc: ch.arc,
              episode: String(ch.episode),
              chapter: String(ch.chapter),
              pov: ch.pov,
              title: 'Test',
              location: '',
              date: '',
              word_count: String(ch.wordCount),
            },
          },
        });
      }
    }
  }

  it('returns aggregate statistics', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'bloom', episode: 1, chapter: 2, pov: 'Bob', wordCount: 2000 },
      { arc: 'work', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1500 },
    ]);

    const result = await stats({ dbPath });

    expect(result.totalChapters).toBe(3);
    expect(result.totalWords).toBe(4500);
    expect(result.arcs).toEqual(['bloom', 'work']);
    expect(result.povs).toEqual({ alice: 2, bob: 1 });
    expect(result.averageWordsPerChapter).toBe(1500);
  });

  it('filters by arc', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'work', episode: 1, chapter: 1, pov: 'Bob', wordCount: 2000 },
    ]);

    const result = await stats({ arc: 'bloom', dbPath });

    expect(result.totalChapters).toBe(1);
    expect(result.arcs).toEqual(['bloom']);
  });

  it('filters by multiple arcs', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'work', episode: 1, chapter: 1, pov: 'Bob', wordCount: 2000 },
      { arc: 'other', episode: 1, chapter: 1, pov: 'Carol', wordCount: 500 },
    ]);

    const result = await stats({ arc: 'bloom, work', dbPath });

    expect(result.totalChapters).toBe(2);
    expect(result.arcs).toEqual(['bloom', 'work']);
  });

  it('filters by pov', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'bloom', episode: 1, chapter: 2, pov: 'Bob', wordCount: 2000 },
    ]);

    const result = await stats({ pov: 'Alice', dbPath });

    expect(result.totalChapters).toBe(1);
    expect(result.povs).toEqual({ alice: 1 });
  });

  it('normalizes POV to lowercase', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'bloom', episode: 1, chapter: 2, pov: 'alice', wordCount: 2000 },
      { arc: 'bloom', episode: 1, chapter: 3, pov: 'ALICE', wordCount: 500 },
    ]);

    const result = await stats({ dbPath });

    expect(result.povs).toEqual({ alice: 3 });
  });

  it('filters by multiple povs', async () => {
    await seedChapters([
      { arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 },
      { arc: 'bloom', episode: 1, chapter: 2, pov: 'Bob', wordCount: 2000 },
      { arc: 'bloom', episode: 1, chapter: 3, pov: 'Carol', wordCount: 500 },
    ]);

    const result = await stats({ pov: 'alice, bob', dbPath });

    expect(result.totalChapters).toBe(2);
  });

  it('throws error when no chapters indexed', async () => {
    await expect(stats({ dbPath })).rejects.toThrow('No indexed chapters found');
  });

  it('throws error when arc not found', async () => {
    await seedChapters([{ arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 }]);

    await expect(stats({ arc: 'unknown', dbPath })).rejects.toThrow('No chapters found for arc');
  });

  it('throws error when multi-arc filter matches nothing', async () => {
    await seedChapters([{ arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 }]);

    await expect(stats({ arc: 'x,y', dbPath })).rejects.toThrow('No chapters found for arc');
  });

  it('throws error when pov not found', async () => {
    await seedChapters([{ arc: 'bloom', episode: 1, chapter: 1, pov: 'Alice', wordCount: 1000 }]);

    await expect(stats({ pov: 'Unknown', dbPath })).rejects.toThrow('No chapters found for POV');
  });
});
