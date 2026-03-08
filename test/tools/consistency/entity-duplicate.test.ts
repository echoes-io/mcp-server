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
import { checkEntityDuplicate } from '../../../lib/tools/consistency/rules/entity-duplicate.js';

describe('entity-duplicate rule', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedEntities(entities: Array<{ name: string; type: string }>) {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });
    for (const e of entities) {
      await storage.graph.addEntity({
        id: `${e.type}:${e.name}`,
        name: e.name,
        type: e.type,
        description: `Description of ${e.name}`,
        sourceChunkIds: ['ch1'],
      });
    }
  }

  it('returns empty array when no duplicates', async () => {
    await seedEntities([
      { name: 'Alice', type: 'CHARACTER' },
      { name: 'Bob', type: 'CHARACTER' },
      { name: 'Roma', type: 'LOCATION' },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects similar names by prefix', async () => {
    await seedEntities([
      { name: 'Alice', type: 'CHARACTER' },
      { name: 'Ali', type: 'CHARACTER' },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('ENTITY_DUPLICATE');
    expect(issues[0].severity).toBe('info');
    expect(issues[0].details.entities).toContain('Alice');
    expect(issues[0].details.entities).toContain('Ali');
  });

  it('detects similar names by Levenshtein distance', async () => {
    await seedEntities([
      { name: 'Alice', type: 'CHARACTER' },
      { name: 'Alica', type: 'CHARACTER' },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
  });

  it('groups multiple similar entities', async () => {
    await seedEntities([
      { name: 'Ale', type: 'CHARACTER' },
      { name: 'Alessandra', type: 'CHARACTER' },
      { name: 'Alexandra', type: 'CHARACTER' },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for empty database', async () => {
    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('does not flag completely different names', async () => {
    await seedEntities([
      { name: 'Marco', type: 'CHARACTER' },
      { name: 'Giulia', type: 'CHARACTER' },
      { name: 'Francesco', type: 'CHARACTER' },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });
});
