import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../../lib/database/index.js';
import type { EntityType } from '../../../lib/database/schemas.js';
import { checkEntityDuplicate } from '../../../lib/tools/consistency/rules/entity-duplicate.js';

describe('entity-duplicate rule', () => {
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

  async function seedEntities(entities: Array<{ name: string; type: EntityType }>) {
    const db = new Database(dbPath);
    await db.connect();

    const records = entities.map((e, _i) => ({
      id: `arc1:${e.type}:${e.name}`,
      arc: 'arc1',
      name: e.name,
      type: e.type,
      description: `Description of ${e.name}`,
      aliases: [],
      vector: Array(384).fill(0),
      chapters: ['arc1:1:1'],
      chapter_count: 1,
      first_appearance: 'arc1:1:1',
      indexed_at: Date.now(),
    }));

    await db.upsertEntities(records);
    db.close();
  }

  it('returns empty array when no duplicates', async () => {
    await seedEntities([
      { name: 'Alice', type: 'CHARACTER' as const },
      { name: 'Bob', type: 'CHARACTER' as const },
      { name: 'Roma', type: 'LOCATION' as const },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects similar names by prefix', async () => {
    await seedEntities([
      { name: 'Alice', type: 'CHARACTER' as const },
      { name: 'Ali', type: 'CHARACTER' as const },
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
      { name: 'Alice', type: 'CHARACTER' as const },
      { name: 'Alica', type: 'CHARACTER' as const }, // 1 char difference
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    expect(issues).toHaveLength(1);
  });

  it('groups multiple similar entities', async () => {
    await seedEntities([
      { name: 'Ale', type: 'CHARACTER' as const },
      { name: 'Alessandra', type: 'CHARACTER' as const },
      { name: 'Alexandra', type: 'CHARACTER' as const },
    ]);

    const issues = await checkEntityDuplicate(dbPath, 'arc1');
    // Ale is prefix of Alessandra, but Alexandra is different
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for empty database', async () => {
    const db = new Database(dbPath);
    await db.connect();
    db.close();

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
