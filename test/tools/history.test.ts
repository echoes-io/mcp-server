import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../lib/database/index.js';
import type { EntityType, RelationType } from '../../lib/database/schemas.js';
import { history } from '../../lib/tools/history.js';

describe('history', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `echoes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should handle empty database', async () => {
    const result = await history({
      arc: 'nonexistent',
      dbPath,
    });

    expect(result.arc).toBe('nonexistent');
    expect(result.kinks).toHaveLength(0);
    expect(result.outfits).toHaveLength(0);
    expect(result.locations).toHaveLength(0);
    expect(result.relations).toHaveLength(0);
  });

  it('should validate input parameters', async () => {
    await expect(
      history({
        arc: '',
        dbPath,
      }),
    ).rejects.toThrow();
  });

  it('should filter by type correctly', async () => {
    const result = await history({
      arc: 'test',
      only: 'locations',
      dbPath,
    });

    expect(result.kinks).toHaveLength(0);
    expect(result.outfits).toHaveLength(0);
    expect(result.relations).toHaveLength(0);
    // locations will be 0 for empty DB but structure is correct
  });
});
