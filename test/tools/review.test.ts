import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../lib/database/index.js';
import type { EntityType, RelationType } from '../../lib/database/schemas.js';
import { reviewGenerate } from '../../lib/tools/review-generate.js';
import { reviewStatus } from '../../lib/tools/review-status.js';

describe('review tools', () => {
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

  async function seedData() {
    const db = new Database(dbPath);
    await db.connect();

    // Add entities with different review statuses
    await db.upsertEntities([
      {
        id: 'arc1:CHARACTER:Alice',
        arc: 'arc1',
        name: 'Alice',
        type: 'CHARACTER' as EntityType,
        description: 'Main character',
        aliases: ['Ali'],
        vector: Array(384).fill(0.1),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
        review_status: 'pending',
        reviewed_at: null,
        original_extraction: null,
      } as any,
      {
        id: 'arc1:CHARACTER:Bob',
        arc: 'arc1',
        name: 'Bob',
        type: 'CHARACTER' as EntityType,
        description: 'Secondary character',
        aliases: [],
        vector: Array(384).fill(0.2),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
        review_status: 'approved',
        reviewed_at: Date.now(),
        original_extraction: null,
      } as any,
    ]);

    // Add relations with different review statuses
    await db.upsertRelations([
      {
        id: 'arc1:Alice:LOVES:Bob',
        arc: 'arc1',
        source_entity: 'arc1:CHARACTER:Alice',
        target_entity: 'arc1:CHARACTER:Bob',
        type: 'LOVES' as RelationType,
        description: 'Alice loves Bob',
        weight: 0.9,
        chapters: ['arc1:1:1'],
        indexed_at: Date.now(),
        review_status: 'pending',
        reviewed_at: null,
        original_extraction: null,
      } as any,
    ]);

    db.close();
  }

  describe('reviewStatus', () => {
    it('should return review statistics', async () => {
      await seedData();

      const result = await reviewStatus({
        arc: 'arc1',
        dbPath,
      });

      expect(result.arc).toBe('arc1');
      expect(result.entities.total).toBe(2);
      expect(result.entities.pending).toBe(1);
      expect(result.entities.approved).toBe(1);
      expect(result.relations.total).toBe(1);
      expect(result.relations.pending).toBe(1);
    });

    it('should handle empty database', async () => {
      const result = await reviewStatus({
        arc: 'nonexistent',
        dbPath,
      });

      expect(result.arc).toBe('nonexistent');
      expect(result.entities.total).toBe(0);
      expect(result.relations.total).toBe(0);
    });

    it('should validate input parameters', async () => {
      await expect(
        reviewStatus({
          arc: '',
          dbPath,
        }),
      ).rejects.toThrow();
    });
  });

  describe('reviewGenerate', () => {
    it('should generate review file for pending items', async () => {
      await seedData();

      const result = await reviewGenerate({
        arc: 'arc1',
        dbPath,
      });

      expect(result.file).toBe('.echoes-review.yaml');
      expect(result.stats.entities).toBe(1); // Only pending Alice
      expect(result.stats.relations).toBe(1); // Only pending relation
      expect(result.content).toContain('Arc: arc1');
      expect(result.content).toContain('name: "Alice"');
      expect(result.content).toContain('status: pending');
    });

    it('should generate review file for all items', async () => {
      await seedData();

      const result = await reviewGenerate({
        arc: 'arc1',
        filter: 'all',
        dbPath,
      });

      expect(result.stats.entities).toBe(2); // Both Alice and Bob
      expect(result.stats.relations).toBe(1);
      expect(result.content).toContain('name: "Alice"');
      expect(result.content).toContain('name: "Bob"');
    });

    it('should handle empty database', async () => {
      const result = await reviewGenerate({
        arc: 'nonexistent',
        dbPath,
      });

      expect(result.stats.entities).toBe(0);
      expect(result.stats.relations).toBe(0);
      expect(result.content).toContain('entities:\n  []');
      expect(result.content).toContain('relations:\n  []');
    });

    it('should validate input parameters', async () => {
      await expect(
        reviewGenerate({
          arc: '',
          dbPath,
        }),
      ).rejects.toThrow();
    });

    it('should use custom output file', async () => {
      const result = await reviewGenerate({
        arc: 'test',
        output: 'custom-review.yaml',
        dbPath,
      });

      expect(result.file).toBe('custom-review.yaml');
    });
  });
});
