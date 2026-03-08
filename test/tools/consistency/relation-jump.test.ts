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

import { createEchoesRAG } from '../../../lib/rag/index.js';
import { checkRelationJump } from '../../../lib/tools/consistency/rules/relation-jump.js';

describe('relation-jump rule', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedRelations(
    relations: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
      chapters: string[];
    }>,
  ) {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });

    // Ensure entities exist
    const entityNames = new Set<string>();
    for (const r of relations) {
      entityNames.add(r.source);
      entityNames.add(r.target);
    }
    for (const name of entityNames) {
      await storage.graph.addEntity({
        id: `CHARACTER:${name}`,
        name,
        type: 'CHARACTER',
        description: name,
        sourceChunkIds: ['1:1'],
      });
    }

    for (let i = 0; i < relations.length; i++) {
      const r = relations[i];
      await storage.graph.addRelation({
        id: `${r.source}:${r.type}:${r.target}:${i}`,
        sourceId: `CHARACTER:${r.source}`,
        targetId: `CHARACTER:${r.target}`,
        type: r.type,
        description: `${r.source} ${r.type} ${r.target}`,
        keywords: [],
        sourceChunkIds: r.chapters,
        fields: { weight: r.weight },
      });
    }
  }

  it('returns empty array when no relations', async () => {
    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('returns empty array when no drastic changes', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'KNOWS', weight: 0.5, chapters: ['1:1'] },
      { source: 'Alice', target: 'Bob', type: 'FRIENDS_WITH', weight: 0.7, chapters: ['1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects LOVES to HATES change', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['1:1'] },
      { source: 'Alice', target: 'Bob', type: 'HATES', weight: 0.8, chapters: ['1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('RELATION_JUMP');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('LOVES');
    expect(issues[0].message).toContain('HATES');
  });

  it('detects FRIENDS_WITH to ENEMIES_WITH change', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Carol', type: 'FRIENDS_WITH', weight: 0.8, chapters: ['1:1'] },
      { source: 'Alice', target: 'Carol', type: 'ENEMIES_WITH', weight: 0.7, chapters: ['2:1'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
  });

  it('detects drastic weight drop', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['1:1'] },
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.3, chapters: ['1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('weight dropped');
  });

  it('does not flag small weight changes', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['1:1'] },
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.7, chapters: ['1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('handles multiple chapters in same relation', async () => {
    await seedRelations([
      {
        source: 'Alice',
        target: 'Bob',
        type: 'LOVES',
        weight: 0.9,
        chapters: ['1:1', '1:3', '1:5'],
      },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });
});
