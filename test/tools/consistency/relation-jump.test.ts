import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../../lib/database/index.js';
import type { RelationType } from '../../../lib/database/schemas.js';
import { checkRelationJump } from '../../../lib/tools/consistency/rules/relation-jump.js';

describe('relation-jump rule', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `echoes-test-${Date.now()}`);
    dbPath = join(testDir, 'db');
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  async function seedRelations(
    relations: Array<{
      source: string;
      target: string;
      type: RelationType;
      weight: number;
      chapters: string[];
    }>,
  ) {
    const db = new Database(dbPath);
    await db.connect();

    const records = relations.map((r) => ({
      id: `arc1:${r.source}:${r.type}:${r.target}`,
      arc: 'arc1',
      source_entity: `arc1:CHARACTER:${r.source}`,
      target_entity: `arc1:CHARACTER:${r.target}`,
      type: r.type,
      description: `${r.source} ${r.type} ${r.target}`,
      weight: r.weight,
      chapters: r.chapters,
      indexed_at: Date.now(),
    }));

    await db.upsertRelations(records);
    db.close();
  }

  it('returns empty array when no relations', async () => {
    const db = new Database(dbPath);
    await db.connect();
    db.close();

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('returns empty array when no drastic changes', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'KNOWS', weight: 0.5, chapters: ['arc1:1:1'] },
      { source: 'Alice', target: 'Bob', type: 'FRIENDS_WITH', weight: 0.7, chapters: ['arc1:1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects LOVES to HATES change', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['arc1:1:1'] },
      { source: 'Alice', target: 'Bob', type: 'HATES', weight: 0.8, chapters: ['arc1:1:5'] },
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
      {
        source: 'Alice',
        target: 'Carol',
        type: 'FRIENDS_WITH',
        weight: 0.8,
        chapters: ['arc1:1:1'],
      },
      {
        source: 'Alice',
        target: 'Carol',
        type: 'ENEMIES_WITH',
        weight: 0.7,
        chapters: ['arc1:2:1'],
      },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
  });

  it('detects drastic weight drop', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['arc1:1:1'] },
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.3, chapters: ['arc1:1:5'] },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('weight dropped');
  });

  it('does not flag small weight changes', async () => {
    await seedRelations([
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.9, chapters: ['arc1:1:1'] },
      { source: 'Alice', target: 'Bob', type: 'LOVES', weight: 0.7, chapters: ['arc1:1:5'] },
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
        chapters: ['arc1:1:1', 'arc1:1:3', 'arc1:1:5'],
      },
    ]);

    const issues = await checkRelationJump(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });
});
