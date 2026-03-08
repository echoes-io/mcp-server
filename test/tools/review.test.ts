import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
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
import { reviewApply } from '../../lib/tools/review-apply.js';
import { reviewGenerate } from '../../lib/tools/review-generate.js';
import { reviewStatus } from '../../lib/tools/review-status.js';

describe('review tools', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-review-test-'));
    dbPath = join(tempDir, 'db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function seedData() {
    const { storage } = createEchoesRAG({ dbPath, arc: 'arc1' });

    await storage.graph.addEntity({
      id: 'CHARACTER:Alice',
      name: 'Alice',
      type: 'CHARACTER',
      description: 'Main character',
      sourceChunkIds: ['1:1'],
      fields: { aliases: ['Ali'], review_status: 'pending' },
    });

    await storage.graph.addEntity({
      id: 'CHARACTER:Bob',
      name: 'Bob',
      type: 'CHARACTER',
      description: 'Secondary character',
      sourceChunkIds: ['1:1'],
      fields: { aliases: [], review_status: 'approved', reviewed_at: Date.now() },
    });

    await storage.graph.addRelation({
      id: 'Alice:LOVES:Bob',
      sourceId: 'CHARACTER:Alice',
      targetId: 'CHARACTER:Bob',
      type: 'LOVES',
      description: 'Alice loves Bob',
      keywords: [],
      sourceChunkIds: ['1:1'],
      fields: { weight: 0.9, review_status: 'pending' },
    });
  }

  describe('reviewStatus', () => {
    it('should return review statistics', async () => {
      await seedData();

      const result = await reviewStatus({ arc: 'arc1', dbPath });

      expect(result.arc).toBe('arc1');
      expect(result.entities.total).toBe(2);
      expect(result.entities.pending).toBe(1);
      expect(result.entities.approved).toBe(1);
      expect(result.relations.total).toBe(1);
      expect(result.relations.pending).toBe(1);
    });

    it('should handle empty database', async () => {
      const result = await reviewStatus({ arc: 'nonexistent', dbPath });

      expect(result.arc).toBe('nonexistent');
      expect(result.entities.total).toBe(0);
      expect(result.relations.total).toBe(0);
    });

    it('should default to pending when no review_status field', async () => {
      const { storage } = createEchoesRAG({ dbPath, arc: 'arc2' });
      await storage.graph.addEntity({
        id: 'CHARACTER:NoFields',
        name: 'NoFields',
        type: 'CHARACTER',
        description: 'No fields',
        sourceChunkIds: ['1:1'],
      });

      const result = await reviewStatus({ arc: 'arc2', dbPath });

      expect(result.entities.total).toBe(1);
      expect(result.entities.pending).toBe(1);
    });

    it('should validate input parameters', async () => {
      await expect(reviewStatus({ arc: '', dbPath })).rejects.toThrow();
    });
  });

  describe('reviewGenerate', () => {
    it('should generate review file for pending items', async () => {
      await seedData();

      const result = await reviewGenerate({ arc: 'arc1', dbPath });

      expect(result.file).toBe('.echoes-review.yaml');
      expect(result.stats.entities).toBe(1); // Only pending Alice
      expect(result.stats.relations).toBe(1);
      expect(result.content).toContain('Arc: arc1');
      expect(result.content).toContain('name: "Alice"');
      expect(result.content).toContain('status: pending');
    });

    it('should generate review file for all items', async () => {
      await seedData();

      const result = await reviewGenerate({ arc: 'arc1', filter: 'all', dbPath });

      expect(result.stats.entities).toBe(2);
      expect(result.stats.relations).toBe(1);
      expect(result.content).toContain('name: "Alice"');
      expect(result.content).toContain('name: "Bob"');
    });

    it('should handle empty database', async () => {
      const result = await reviewGenerate({ arc: 'nonexistent', dbPath });

      expect(result.stats.entities).toBe(0);
      expect(result.stats.relations).toBe(0);
      expect(result.content).toContain('entities:\n  []');
      expect(result.content).toContain('relations:\n  []');
    });

    it('should validate input parameters', async () => {
      await expect(reviewGenerate({ arc: '', dbPath })).rejects.toThrow();
    });

    it('should use custom output file', async () => {
      const result = await reviewGenerate({ arc: 'test', output: 'custom-review.yaml', dbPath });

      expect(result.file).toBe('custom-review.yaml');
    });
  });

  describe('reviewApply', () => {
    it('should handle dry run mode', async () => {
      const yamlContent = `# Test review file
arc: test-arc

entities:
  - id: "test:CHARACTER:Alice"
    name: "Alice"
    type: "CHARACTER"
    description: "Test character"
    aliases: []
    status: approved

relations:
  - id: "test:Alice:LOVES:Bob"
    source: "Alice"
    target: "Bob"
    type: "LOVES"
    description: "Test relation"
    weight: 0.9
    chapters: []
    status: approved

additions:
  entities: []
  relations: []`;

      const testFile = join(tempDir, 'test-review.yaml');
      await writeFile(testFile, yamlContent, 'utf8');

      const result = await reviewApply({ file: testFile, dryRun: true, dbPath });

      expect(result.preview).toBe(true);
      expect(result.changes.entities.approved).toBe(1);
      expect(result.changes.relations.approved).toBe(1);
      expect(result.details).toContain('✅ Entity approved: Alice');
      expect(result.details).toContain('✅ Relation approved: Alice → LOVES → Bob');
    });

    it('should validate input parameters', async () => {
      await expect(reviewApply({ file: '', dbPath })).rejects.toThrow();
    });

    it('should apply changes when not dry run', async () => {
      const yamlContent = `entities:
  - id: "arc1:CHARACTER:Alice"
    name: "Alice"
    type: "CHARACTER"
    description: "Updated"
    status: approved

relations:
  - id: "arc1:Alice:LOVES:Bob"
    source: "Alice"
    target: "Bob"
    type: "LOVES"
    description: "Updated"
    weight: 0.9
    chapters: []
    status: approved`;

      const testFile = join(tempDir, 'apply-review.yaml');
      await writeFile(testFile, yamlContent, 'utf8');

      const result = await reviewApply({ file: testFile, dryRun: false, dbPath });

      expect(result.preview).toBe(false);
      expect(result.changes.entities.approved).toBe(1);
      expect(result.changes.relations.approved).toBe(1);
    });

    it('should handle missing file', async () => {
      await expect(reviewApply({ file: 'nonexistent.yaml', dbPath })).rejects.toThrow();
    });
  });
});
