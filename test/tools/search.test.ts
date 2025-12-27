import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Database } from '../../lib/database/index.js';
import type {
  ChapterRecord,
  EntityRecord,
  EntityType,
  RelationRecord,
  RelationType,
} from '../../lib/database/schemas.js';
import { generateEmbedding, resetExtractor } from '../../lib/indexer/embeddings.js';
import { search } from '../../lib/tools/search.js';

const TEST_MODEL = 'Xenova/all-MiniLM-L6-v2';

describe('search', () => {
  let tempDir: string;
  let dbPath: string;

  beforeAll(async () => {
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-search-test-'));
    dbPath = join(tempDir, 'db');
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    resetExtractor();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  const createChapter = async (
    id: string,
    arc: string,
    content: string,
  ): Promise<ChapterRecord> => {
    const vector = await generateEmbedding(content);
    return {
      id,
      file_path: `${arc}/${id}.md`,
      file_hash: 'hash',
      arc,
      episode: 1,
      chapter: 1,
      pov: 'Alice',
      title: 'Test',
      location: 'Rome',
      date: '',
      content,
      summary: '',
      word_count: content.split(' ').length,
      char_count: content.length,
      paragraph_count: 1,
      vector,
      entities: [],
      indexed_at: Date.now(),
    };
  };

  const createEntity = async (
    id: string,
    arc: string,
    name: string,
    type: EntityType,
    description: string,
  ): Promise<EntityRecord> => {
    const vector = await generateEmbedding(`${name}: ${description}`);
    return {
      id,
      arc,
      name,
      type,
      description,
      aliases: [],
      vector,
      chapters: [],
      chapter_count: 1,
      first_appearance: '',
      indexed_at: Date.now(),
    };
  };

  const createRelation = (
    id: string,
    arc: string,
    source: string,
    target: string,
    type: RelationType,
    description: string,
  ): RelationRecord => ({
    id,
    arc,
    source_entity: source,
    target_entity: target,
    type,
    description,
    weight: 0.5,
    chapters: ['ch1'],
    indexed_at: Date.now(),
  });

  describe('chapters', () => {
    it('searches chapters by semantic similarity', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([
        await createChapter('bloom:1:1', 'bloom', 'Alice went to the airport to meet Bob'),
        await createChapter('bloom:1:2', 'bloom', 'The restaurant served delicious pasta'),
      ]);
      db.close();

      const result = await search({ query: 'meeting at the airport', type: 'chapters', dbPath });

      expect(result.type).toBe('chapters');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('bloom:1:1'); // Airport chapter should rank first
      expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    });

    it('filters by arc', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([
        await createChapter('bloom:1:1', 'bloom', 'Alice at the airport'),
        await createChapter('work:1:1', 'work', 'Bob at the airport'),
      ]);
      db.close();

      const result = await search({ query: 'airport', type: 'chapters', arc: 'bloom', dbPath });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].arc).toBe('bloom');
    });

    it('respects limit', async () => {
      const db = new Database(dbPath);
      await db.upsertChapters([
        await createChapter('bloom:1:1', 'bloom', 'Chapter one'),
        await createChapter('bloom:1:2', 'bloom', 'Chapter two'),
        await createChapter('bloom:1:3', 'bloom', 'Chapter three'),
      ]);
      db.close();

      const result = await search({ query: 'chapter', type: 'chapters', limit: 2, dbPath });

      expect(result.results).toHaveLength(2);
    });

    it('truncates long content', async () => {
      const longContent = 'word '.repeat(200);
      const db = new Database(dbPath);
      await db.upsertChapters([await createChapter('bloom:1:1', 'bloom', longContent)]);
      db.close();

      const result = await search({ query: 'word', type: 'chapters', dbPath });

      expect(result.results[0].content.length).toBeLessThan(600);
      expect(result.results[0].content.endsWith('...')).toBe(true);
    });

    it('does not truncate short content', async () => {
      const shortContent = 'Short content here';
      const db = new Database(dbPath);
      await db.upsertChapters([await createChapter('bloom:1:1', 'bloom', shortContent)]);
      db.close();

      const result = await search({ query: 'short', type: 'chapters', dbPath });

      expect(result.results[0].content).toBe(shortContent);
      expect(result.results[0].content.endsWith('...')).toBe(false);
    });
  });

  describe('entities', () => {
    it('searches entities by semantic similarity', async () => {
      const db = new Database(dbPath);
      await db.upsertEntities([
        await createEntity(
          'bloom:CHARACTER:Alice',
          'bloom',
          'Alice',
          'CHARACTER',
          'A young woman with red hair',
        ),
        await createEntity(
          'bloom:LOCATION:Rome',
          'bloom',
          'Rome',
          'LOCATION',
          'The eternal city in Italy',
        ),
      ]);
      db.close();

      const result = await search({ query: 'woman', type: 'entities', dbPath });

      expect(result.type).toBe('entities');
      expect(result.results[0].name).toBe('Alice');
    });

    it('filters by entity type', async () => {
      const db = new Database(dbPath);
      await db.upsertEntities([
        await createEntity('bloom:CHARACTER:Alice', 'bloom', 'Alice', 'CHARACTER', 'A person'),
        await createEntity('bloom:LOCATION:Rome', 'bloom', 'Rome', 'LOCATION', 'A city'),
      ]);
      db.close();

      const result = await search({
        query: 'place',
        type: 'entities',
        entityType: 'LOCATION',
        dbPath,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('LOCATION');
    });

    it('filters by arc', async () => {
      const db = new Database(dbPath);
      await db.upsertEntities([
        await createEntity('bloom:CHARACTER:Alice', 'bloom', 'Alice', 'CHARACTER', 'Person'),
        await createEntity('work:CHARACTER:Bob', 'work', 'Bob', 'CHARACTER', 'Person'),
      ]);
      db.close();

      const result = await search({ query: 'person', type: 'entities', arc: 'bloom', dbPath });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].arc).toBe('bloom');
    });
  });

  describe('relations', () => {
    it('searches relations by text match', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        createRelation(
          'bloom:Alice:LOVES:Bob',
          'bloom',
          'Alice',
          'Bob',
          'LOVES',
          'Alice loves Bob',
        ),
        createRelation(
          'bloom:Carol:KNOWS:Dave',
          'bloom',
          'Carol',
          'Dave',
          'KNOWS',
          'Carol knows Dave',
        ),
      ]);
      db.close();

      const result = await search({ query: 'Alice', type: 'relations', dbPath });

      expect(result.type).toBe('relations');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source_entity).toBe('Alice');
    });

    it('filters by relation type', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        createRelation('bloom:Alice:LOVES:Bob', 'bloom', 'Alice', 'Bob', 'LOVES', 'Love'),
        createRelation('bloom:Alice:KNOWS:Carol', 'bloom', 'Alice', 'Carol', 'KNOWS', 'Knows'),
      ]);
      db.close();

      const result = await search({
        query: 'Alice',
        type: 'relations',
        relationType: 'LOVES',
        dbPath,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('LOVES');
    });

    it('filters by arc', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        createRelation('bloom:Alice:LOVES:Bob', 'bloom', 'Alice', 'Bob', 'LOVES', 'Love'),
        createRelation('work:Alice:KNOWS:Carol', 'work', 'Alice', 'Carol', 'KNOWS', 'Knows'),
      ]);
      db.close();

      const result = await search({ query: 'Alice', type: 'relations', arc: 'bloom', dbPath });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].arc).toBe('bloom');
    });

    it('matches on description', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        createRelation('bloom:A:LOVES:B', 'bloom', 'A', 'B', 'LOVES', 'They met at the airport'),
      ]);
      db.close();

      const result = await search({ query: 'airport', type: 'relations', dbPath });

      expect(result.results).toHaveLength(1);
    });

    it('respects limit', async () => {
      const db = new Database(dbPath);
      await db.upsertRelations([
        createRelation('bloom:Alice:LOVES:Bob', 'bloom', 'Alice', 'Bob', 'LOVES', 'Love'),
        createRelation('bloom:Alice:KNOWS:Carol', 'bloom', 'Alice', 'Carol', 'KNOWS', 'Knows'),
        createRelation(
          'bloom:Alice:FRIENDS_WITH:Dave',
          'bloom',
          'Alice',
          'Dave',
          'FRIENDS_WITH',
          'Friends',
        ),
      ]);
      db.close();

      const result = await search({ query: 'Alice', type: 'relations', limit: 2, dbPath });

      expect(result.results).toHaveLength(2);
    });
  });
});
