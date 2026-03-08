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
import { history } from '../../lib/tools/history.js';

describe('history', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-history-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle empty database', async () => {
    const result = await history({ arc: 'nonexistent', dbPath });

    expect(result.arc).toBe('nonexistent');
    expect(result.kinks).toHaveLength(0);
    expect(result.outfits).toHaveLength(0);
    expect(result.locations).toHaveLength(0);
    expect(result.relations).toHaveLength(0);
  });

  it('should validate input parameters', async () => {
    await expect(history({ arc: '', dbPath })).rejects.toThrow();
  });

  it('should filter by type correctly', async () => {
    const result = await history({ arc: 'test', only: 'locations', dbPath });

    expect(result.kinks).toHaveLength(0);
    expect(result.outfits).toHaveLength(0);
    expect(result.relations).toHaveLength(0);
  });

  it('should filter by only=kinks', async () => {
    const { storage } = createEchoesRAG({ dbPath, arc: 'only-test' });
    await storage.kv.set('doc:only-test:1:1', {
      metadata: {
        fields: {
          episode: '1',
          chapter: '1',
          pov: 'Alice',
          location: 'Roma',
          kink: 'primo bacio',
          outfit: 'Alice: vestito',
        },
      },
    });

    const result = await history({ arc: 'only-test', only: 'kinks', dbPath });

    expect(result.kinks).toHaveLength(1);
    expect(result.outfits).toHaveLength(0);
    expect(result.locations).toHaveLength(0);
  });

  it('should return kinks and locations from chapters', async () => {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });
    await storage.kv.set('doc:arc1:1:2', {
      metadata: {
        fields: {
          episode: '1',
          chapter: '2',
          pov: 'Alice',
          location: 'Milano',
          kink: 'secondo bacio',
        },
      },
    });
    await storage.kv.set('doc:arc1:1:1', {
      metadata: {
        fields: {
          episode: '1',
          chapter: '1',
          pov: 'Alice',
          location: 'Roma',
          kink: 'primo bacio',
          outfit: 'Alice: vestito rosso',
        },
      },
    });

    const result = await history({ arc: 'arc1', dbPath });

    expect(result.kinks).toHaveLength(2);
    expect(result.kinks[0].kink).toBe('primo bacio');
    expect(result.locations).toHaveLength(2);
    expect(result.locations[0].location).toBe('Roma');
    expect(result.outfits).toHaveLength(1);
    expect(result.outfits[0].character).toBe('Alice');
  });

  it('should return relations from graph', async () => {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });
    await storage.graph.addEntity({
      id: 'CHARACTER:Alice',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'Test',
      sourceChunkIds: ['1:1'],
    });
    await storage.graph.addEntity({
      id: 'CHARACTER:Bob',
      name: 'Bob',
      type: 'CHARACTER',
      description: 'Test',
      sourceChunkIds: ['1:1'],
    });
    await storage.graph.addRelation({
      id: 'r1',
      sourceId: 'CHARACTER:Alice',
      targetId: 'CHARACTER:Bob',
      type: 'LOVES',
      description: 'Test',
      keywords: [],
      sourceChunkIds: ['1:1'],
    });

    const result = await history({ arc: 'arc1', dbPath });

    expect(result.relations).toHaveLength(1);
    expect(result.relations[0].type).toBe('LOVES');
  });

  it('should filter by character', async () => {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });
    await storage.kv.set('doc:arc1:1:1', {
      metadata: {
        fields: {
          arc: 'arc1',
          episode: '1',
          chapter: '1',
          pov: 'Alice',
          title: 'T',
          location: 'Roma',
        },
      },
    });
    await storage.kv.set('doc:arc1:1:2', {
      metadata: {
        fields: {
          arc: 'arc1',
          episode: '1',
          chapter: '2',
          pov: 'Bob',
          title: 'T',
          location: 'Milano',
        },
      },
    });

    const result = await history({ arc: 'arc1', character: 'Alice', dbPath });

    expect(result.locations).toHaveLength(1);
    expect(result.locations[0].location).toBe('Roma');
  });

  it('should filter by search term', async () => {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });
    await storage.kv.set('doc:arc1:1:1', {
      metadata: {
        fields: {
          arc: 'arc1',
          episode: '1',
          chapter: '1',
          pov: 'Alice',
          title: 'T',
          location: 'Roma',
          kink: 'primo bacio',
        },
      },
    });
    await storage.kv.set('doc:arc1:1:2', {
      metadata: {
        fields: {
          arc: 'arc1',
          episode: '1',
          chapter: '2',
          pov: 'Alice',
          title: 'T',
          location: 'Milano',
          kink: 'primo appuntamento',
        },
      },
    });

    const result = await history({ arc: 'arc1', search: 'bacio', dbPath });

    expect(result.kinks).toHaveLength(1);
    expect(result.kinks[0].kink).toBe('primo bacio');
  });
});
