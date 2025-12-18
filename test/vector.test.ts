import { unlink } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  arcs,
  chapters,
  type DatabaseType,
  episodes,
  initDatabase,
  timelines,
} from '../src/database/index.js';
import { VectorStore } from '../src/database/vector.js';

describe('Vector Search', () => {
  let db: DatabaseType;
  let vectorStore: VectorStore;
  const testDbPath = './test-vector.db';

  beforeEach(async () => {
    db = await initDatabase(testDbPath);
    vectorStore = new VectorStore(db);
  });

  afterEach(async () => {
    try {
      await unlink(testDbPath);
      await unlink(`${testDbPath}-shm`);
      await unlink(`${testDbPath}-wal`);
    } catch {
      // Files might not exist
    }
  });

  it('should insert and search embeddings', async () => {
    // Create test chapter
    const timeline = await db.insert(timelines).values({ name: 'Test' }).returning();
    const arc = await db
      .insert(arcs)
      .values({ timelineId: timeline[0].id, name: 'Test', slug: 'test', order: 1 })
      .returning();
    const episode = await db
      .insert(episodes)
      .values({ arcId: arc[0].id, number: 1, title: 'Test', slug: 'test' })
      .returning();
    const chapter = await db
      .insert(chapters)
      .values({
        episodeId: episode[0].id,
        number: 1,
        pov: 'Alice',
        title: 'Test Chapter',
        summary: 'Test',
        location: 'Test',
      })
      .returning();

    // Create more distinct embeddings
    const embedding1 = new Float32Array(1536);
    embedding1.fill(0.1);
    embedding1[0] = 0.9; // Make it distinct

    const embedding2 = new Float32Array(1536);
    embedding2.fill(0.2);
    embedding2[0] = 0.1; // Different from embedding1

    const queryEmbedding = new Float32Array(1536);
    queryEmbedding.fill(0.1);
    queryEmbedding[0] = 0.8; // Closer to embedding1

    // Insert embeddings
    await vectorStore.insert(
      chapter[0].id,
      'This is about Alice and her adventures',
      embedding1,
      ['Alice', 'Adventure'],
      { type: 'chapter' },
    );

    await vectorStore.insert(
      chapter[0].id,
      'This is about Bob and his journey',
      embedding2,
      ['Bob', 'Journey'],
      { type: 'chapter' },
    );

    // Search
    const results = await vectorStore.search(queryEmbedding, { limit: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].content).toContain('Alice'); // Should be more similar
    expect(results[0].characters).toContain('Alice');
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it('should filter by characters', async () => {
    const timeline = await db.insert(timelines).values({ name: 'Test' }).returning();
    const arc = await db
      .insert(arcs)
      .values({ timelineId: timeline[0].id, name: 'Test', slug: 'test', order: 1 })
      .returning();
    const episode = await db
      .insert(episodes)
      .values({ arcId: arc[0].id, number: 1, title: 'Test', slug: 'test' })
      .returning();
    const chapter = await db
      .insert(chapters)
      .values({
        episodeId: episode[0].id,
        number: 1,
        pov: 'Alice',
        title: 'Test Chapter',
        summary: 'Test',
        location: 'Test',
      })
      .returning();

    const embedding = new Float32Array(1536).fill(0.1);

    // Insert embeddings with different characters
    await vectorStore.insert(chapter[0].id, 'Alice content', embedding, ['Alice']);
    await vectorStore.insert(chapter[0].id, 'Bob content', embedding, ['Bob']);
    await vectorStore.insert(chapter[0].id, 'Alice and Bob content', embedding, ['Alice', 'Bob']);

    // Search for Alice only
    const aliceResults = await vectorStore.search(embedding, {
      characters: ['Alice'],
      limit: 10,
    });

    expect(aliceResults).toHaveLength(2); // Alice and Alice+Bob
    expect(aliceResults.every((r) => r.characters.includes('Alice'))).toBe(true);

    // Search for both Alice AND Bob (should find entries with both)
    const bothResults = await vectorStore.search(embedding, {
      characters: ['Alice', 'Bob'],
      allCharacters: true,
      limit: 10,
    });

    // Should find at least the "Alice and Bob content"
    expect(bothResults.length).toBeGreaterThan(0);
    // Check that at least one result has both characters
    const hasAliceAndBob = bothResults.some(
      (r) => r.characters.includes('Alice') && r.characters.includes('Bob'),
    );
    expect(hasAliceAndBob).toBe(true);
  });

  it('should get co-occurring characters', async () => {
    const timeline = await db.insert(timelines).values({ name: 'Test' }).returning();
    const arc = await db
      .insert(arcs)
      .values({ timelineId: timeline[0].id, name: 'Test', slug: 'test', order: 1 })
      .returning();
    const episode = await db
      .insert(episodes)
      .values({ arcId: arc[0].id, number: 1, title: 'Test', slug: 'test' })
      .returning();
    const chapter = await db
      .insert(chapters)
      .values({
        episodeId: episode[0].id,
        number: 1,
        pov: 'Alice',
        title: 'Test Chapter',
        summary: 'Test',
        location: 'Test',
      })
      .returning();

    const embedding = new Float32Array(1536).fill(0.1);

    // Insert embeddings
    await vectorStore.insert(chapter[0].id, 'Content 1', embedding, ['Alice', 'Bob']);
    await vectorStore.insert(chapter[0].id, 'Content 2', embedding, ['Alice', 'Charlie']);
    await vectorStore.insert(chapter[0].id, 'Content 3', embedding, ['Bob', 'David']);

    // Get characters that appear with Alice
    const coOccurring = await vectorStore.getCharacters('Alice');

    expect(coOccurring).toEqual(['Bob', 'Charlie']); // Sorted, Alice excluded
  });
});
