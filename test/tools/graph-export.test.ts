import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../lib/database/index.js';
import type { EntityType, RelationType } from '../../lib/database/schemas.js';
import { graphExport } from '../../lib/tools/graph-export.js';

describe('graphExport', () => {
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

    // Add entities
    await db.upsertEntities([
      {
        id: 'arc1:CHARACTER:Alice',
        arc: 'arc1',
        name: 'Alice',
        type: 'CHARACTER' as EntityType,
        description: 'Main character',
        aliases: [],
        vector: Array(384).fill(0.1),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
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
      },
      {
        id: 'arc1:LOCATION:Rome',
        arc: 'arc1',
        name: 'Rome',
        type: 'LOCATION' as EntityType,
        description: 'City',
        aliases: [],
        vector: Array(384).fill(0.3),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
    ]);

    // Add relations
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
      },
      {
        id: 'arc1:Alice:LIVES_IN:Rome',
        arc: 'arc1',
        source_entity: 'arc1:CHARACTER:Alice',
        target_entity: 'arc1:LOCATION:Rome',
        type: 'LIVES_IN' as RelationType,
        description: 'Alice lives in Rome',
        weight: 0.8,
        chapters: ['arc1:1:1'],
        indexed_at: Date.now(),
      },
    ]);

    db.close();
  }

  it('should export graph in Mermaid format', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'mermaid',
      dbPath,
    });

    expect(result.format).toBe('mermaid');
    expect(result.content).toContain('graph LR');
    expect(result.content).toContain('Alice -->|LOVES| Bob');
    expect(result.content).toContain('Alice -->|LIVES_IN| Rome');
    expect(result.stats.nodes).toBe(3);
    expect(result.stats.edges).toBe(2);
  });

  it('should export graph in JSON format', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      dbPath,
    });

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

  it('should export graph in DOT format', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'dot',
      dbPath,
    });

    expect(result.format).toBe('dot');
    expect(result.content).toContain('digraph G {');
    expect(result.content).toContain('"Alice" -> "Bob" [label="LOVES"]');
    expect(result.content).toContain('"Alice" -> "Rome" [label="LIVES_IN"]');
    expect(result.content).toContain('}');
  });

  it('should filter by entity types', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      entityTypes: ['CHARACTER'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(2); // Only Alice and Bob
    expect(parsed.links).toHaveLength(1); // Only Alice->Bob relation
    expect(parsed.nodes.every((node: { type: string }) => node.type === 'CHARACTER')).toBe(true);
  });

  it('should filter by characters', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      characters: ['Alice'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(1); // Only Alice
    expect(parsed.links).toHaveLength(0); // No relations since other nodes filtered out
  });

  it('should filter by relation types', async () => {
    await seedData();

    const result = await graphExport({
      arc: 'arc1',
      format: 'json',
      relationTypes: ['LOVES'],
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(3); // All nodes still present
    expect(parsed.links).toHaveLength(1); // Only LOVES relation
    expect(parsed.links[0].type).toBe('LOVES');
  });

  it('should handle empty database', async () => {
    const result = await graphExport({
      arc: 'nonexistent',
      format: 'json',
      dbPath,
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.nodes).toHaveLength(0);
    expect(parsed.links).toHaveLength(0);
    expect(result.stats.nodes).toBe(0);
    expect(result.stats.edges).toBe(0);
  });

  it('should handle special characters in node names for Mermaid', async () => {
    const db = new Database(dbPath);
    await db.connect();

    await db.upsertEntities([
      {
        id: 'arc1:CHARACTER:Alice-Smith',
        arc: 'arc1',
        name: 'Alice-Smith',
        type: 'CHARACTER' as EntityType,
        description: 'Character with special chars',
        aliases: [],
        vector: Array(384).fill(0.1),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
      {
        id: 'arc1:CHARACTER:Bob',
        arc: 'arc1',
        name: 'Bob',
        type: 'CHARACTER' as EntityType,
        description: 'Another character',
        aliases: [],
        vector: Array(384).fill(0.2),
        chapters: ['arc1:1:1'],
        chapter_count: 1,
        first_appearance: 'arc1:1:1',
        indexed_at: Date.now(),
      },
    ]);

    await db.upsertRelations([
      {
        id: 'arc1:Alice-Smith:KNOWS:Bob',
        arc: 'arc1',
        source_entity: 'arc1:CHARACTER:Alice-Smith',
        target_entity: 'arc1:CHARACTER:Bob',
        type: 'KNOWS' as RelationType,
        description: 'Alice-Smith knows Bob',
        weight: 0.7,
        chapters: ['arc1:1:1'],
        indexed_at: Date.now(),
      },
    ]);

    db.close();

    const result = await graphExport({
      arc: 'arc1',
      format: 'mermaid',
      dbPath,
    });

    expect(result.content).toContain('Alice_Smith'); // Special chars replaced
  });
});
