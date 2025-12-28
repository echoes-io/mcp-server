import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock embeddings
vi.mock('../../lib/indexer/embeddings.js', () => ({
  getEmbeddingModel: vi.fn(() => 'test/model'),
  getEmbeddingDtype: vi.fn(() => 'fp32'),
  getEmbeddingDimension: vi.fn(() => Promise.resolve(384)),
  generateEmbedding: vi.fn(() => Promise.resolve(Array(384).fill(0.1))),
  preloadModel: vi.fn(() => Promise.resolve()),
}));

import { Database } from '../../lib/database/index.js';
import type { EntityRecord, RelationRecord } from '../../lib/database/schemas.js';
import { list } from '../../lib/tools/list.js';

describe('list tool', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-list-test-'));
    dbPath = join(tempDir, 'db');

    // Setup test data
    const db = new Database(dbPath);
    await db.connect();

    const entities: EntityRecord[] = [
      {
        id: 'arc1:CHARACTER:Alice',
        arc: 'arc1',
        name: 'Alice',
        type: 'CHARACTER',
        description: 'Main character',
        aliases: ['Ali'],
        vector: Array(384).fill(0.1),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
      {
        id: 'arc1:LOCATION:Forest',
        arc: 'arc1',
        name: 'Forest',
        type: 'LOCATION',
        description: 'Dark forest',
        aliases: [],
        vector: Array(384).fill(0.2),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
    ];

    const relations: RelationRecord[] = [
      {
        id: 'arc1:Alice:LOVES:Bob',
        arc: 'arc1',
        source_entity: 'arc1:CHARACTER:Alice',
        target_entity: 'arc1:CHARACTER:Bob',
        type: 'LOVES',
        description: 'Alice loves Bob',
        weight: 0.8,
        chapters: ['arc1:1:1'],
        indexed_at: Date.now(),
      },
    ];

    await db.upsertEntities(entities);
    await db.upsertRelations(relations);
    db.close();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists all entities', async () => {
    const result = await list({ type: 'entities', dbPath });

    expect(result.type).toBe('entities');
    expect(result.results).toHaveLength(2);
    if (result.type === 'entities') {
      const names = result.results.map((e) => e.name).sort();
      expect(names).toEqual(['Alice', 'Forest']);
    }
  });

  it('filters entities by type', async () => {
    const result = await list({ type: 'entities', entityType: 'LOCATION', dbPath });

    expect(result.type).toBe('entities');
    expect(result.results).toHaveLength(1);
    if (result.type === 'entities') {
      expect(result.results[0].name).toBe('Forest');
    }
  });

  it('filters entities by arc', async () => {
    const result = await list({ type: 'entities', arc: 'nonexistent', dbPath });

    expect(result.type).toBe('entities');
    expect(result.results).toHaveLength(0);
  });

  it('lists all relations', async () => {
    const result = await list({ type: 'relations', dbPath });

    expect(result.type).toBe('relations');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      type: 'LOVES',
      source_entity: 'arc1:CHARACTER:Alice',
      target_entity: 'arc1:CHARACTER:Bob',
    });
  });

  it('filters relations by type', async () => {
    const result = await list({ type: 'relations', relationType: 'HATES', dbPath });

    expect(result.type).toBe('relations');
    expect(result.results).toHaveLength(0);
  });
});
