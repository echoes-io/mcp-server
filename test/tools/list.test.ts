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
import { list } from '../../lib/tools/list.js';

describe('list tool', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-list-test-'));
    dbPath = join(tempDir, 'db');

    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });

    await storage.graph.addEntity({
      id: 'Alice',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'Main character',
      sourceChunkIds: ['ch1'],
    });
    await storage.graph.addEntity({
      id: 'Forest',
      name: 'Forest',
      type: 'LOCATION',
      description: 'Dark forest',
      sourceChunkIds: ['ch1'],
    });
    await storage.graph.addRelation({
      id: 'Alice-LOVES-Bob',
      sourceId: 'Alice',
      targetId: 'Forest',
      type: 'LOCATED_IN',
      description: 'Alice in the forest',
      keywords: [],
      sourceChunkIds: ['ch1'],
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists all entities', async () => {
    const result = await list({ type: 'entities', arc: 'arc1', dbPath });

    expect(result.type).toBe('entities');
    expect(result.results).toHaveLength(2);
    if (result.type === 'entities') {
      const names = result.results.map((e) => e.name).sort();
      expect(names).toEqual(['Alice', 'Forest']);
    }
  });

  it('filters entities by type', async () => {
    const result = await list({ type: 'entities', arc: 'arc1', entityType: 'LOCATION', dbPath });

    expect(result.results).toHaveLength(1);
    if (result.type === 'entities') {
      expect(result.results[0].name).toBe('Forest');
    }
  });

  it('filters entities by arc', async () => {
    const result = await list({ type: 'entities', arc: 'nonexistent', dbPath });

    expect(result.results).toHaveLength(0);
  });

  it('lists all relations', async () => {
    const result = await list({ type: 'relations', arc: 'arc1', dbPath });

    expect(result.type).toBe('relations');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      type: 'LOCATED_IN',
      source_entity: 'Alice',
      target_entity: 'Forest',
    });
  });

  it('filters relations by type', async () => {
    const result = await list({ type: 'relations', arc: 'arc1', relationType: 'HATES', dbPath });

    expect(result.results).toHaveLength(0);
  });
});
