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
import { graphExport } from '../../lib/tools/graph-export.js';

describe('graphExport', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-graph-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedData() {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });

    await storage.graph.addEntity({
      id: 'Alice',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'Main character',
      sourceChunkIds: ['ch1'],
    });
    await storage.graph.addEntity({
      id: 'Bob',
      name: 'Bob',
      type: 'CHARACTER',
      description: 'Secondary character',
      sourceChunkIds: ['ch1'],
    });
    await storage.graph.addEntity({
      id: 'Rome',
      name: 'Rome',
      type: 'LOCATION',
      description: 'City',
      sourceChunkIds: ['ch1'],
    });

    await storage.graph.addRelation({
      id: 'Alice-LOVES-Bob',
      sourceId: 'Alice',
      targetId: 'Bob',
      type: 'LOVES',
      description: 'Alice loves Bob',
      keywords: [],
      sourceChunkIds: ['ch1'],
    });
    await storage.graph.addRelation({
      id: 'Alice-LIVES_IN-Rome',
      sourceId: 'Alice',
      targetId: 'Rome',
      type: 'LIVES_IN',
      description: 'Alice lives in Rome',
      keywords: [],
      sourceChunkIds: ['ch1'],
    });
  }

  it('exports graph in JSON format', async () => {
    await seedData();

    const result = await graphExport({ arc: 'arc1', format: 'json', dbPath });

    expect(result.format).toBe('json');
    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.links).toHaveLength(2);
    expect(parsed.nodes[0]).toHaveProperty('id');
    expect(parsed.nodes[0]).toHaveProperty('type');
    expect(parsed.links[0]).toHaveProperty('source');
    expect(parsed.links[0]).toHaveProperty('target');
    expect(parsed.links[0]).toHaveProperty('type');
  });

  it('exports graph in DOT format', async () => {
    await seedData();

    const result = await graphExport({ arc: 'arc1', format: 'dot', dbPath });

    expect(result.format).toBe('dot');
    expect(result.content).toContain('digraph G {');
    expect(result.content).toContain('"Alice" -> "Bob" [label="LOVES"]');
    expect(result.content).toContain('"Alice" -> "Rome" [label="LIVES_IN"]');
    expect(result.content).toContain('}');
  });

  it('filters by entity types', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      entityTypes: ['CHARACTER'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.links).toHaveLength(1);
    expect(parsed.nodes.every((n: { type: string }) => n.type === 'CHARACTER')).toBe(true);
  });

  it('filters by characters', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      characters: ['Alice'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.links).toHaveLength(0);
  });

  it('filters by relation types', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      relationTypes: ['LOVES'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.links).toHaveLength(1);
    expect(parsed.links[0].type).toBe('LOVES');
  });

  it('handles empty database', async () => {
    const result = await graphExport({ arc: 'nonexistent', format: 'json', dbPath });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(0);
    expect(parsed.links).toHaveLength(0);
    expect(result.stats.nodes).toBe(0);
    expect(result.stats.edges).toBe(0);
  });
});
