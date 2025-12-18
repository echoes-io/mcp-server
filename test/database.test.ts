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

describe('Database', () => {
  let db: DatabaseType;
  const testDbPath = './test.db';

  beforeEach(async () => {
    db = await initDatabase(testDbPath);
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

  it('should initialize database with migrations', async () => {
    expect(db).toBeDefined();
  });

  it('should create and query timeline', async () => {
    const timeline = await db
      .insert(timelines)
      .values({
        name: 'Test Timeline',
        description: 'A test timeline',
      })
      .returning();

    expect(timeline).toHaveLength(1);
    expect(timeline[0].name).toBe('Test Timeline');
    expect(timeline[0].id).toBeDefined();
  });

  it('should create arc with timeline relation', async () => {
    const timeline = await db
      .insert(timelines)
      .values({
        name: 'Test Timeline',
      })
      .returning();

    const arc = await db
      .insert(arcs)
      .values({
        timelineId: timeline[0].id,
        name: 'Test Arc',
        slug: 'test-arc',
        order: 1,
      })
      .returning();

    expect(arc).toHaveLength(1);
    expect(arc[0].name).toBe('Test Arc');
    expect(arc[0].timelineId).toBe(timeline[0].id);
  });

  it('should create basic chapter without JSON', async () => {
    // Timeline
    const timeline = await db
      .insert(timelines)
      .values({
        name: 'Test Timeline',
      })
      .returning();

    // Arc
    const arc = await db
      .insert(arcs)
      .values({
        timelineId: timeline[0].id,
        name: 'Test Arc',
        slug: 'test-arc',
        order: 1,
      })
      .returning();

    // Episode
    const episode = await db
      .insert(episodes)
      .values({
        arcId: arc[0].id,
        number: 1,
        title: 'Test Episode',
        slug: 'test-episode',
      })
      .returning();

    // Chapter without JSON fields
    const chapter = await db
      .insert(chapters)
      .values({
        episodeId: episode[0].id,
        number: 1,
        pov: 'Alice',
        title: 'Test Chapter',
        summary: 'A test chapter',
        location: 'Test Location',
      })
      .returning();

    expect(chapter).toHaveLength(1);
    expect(chapter[0].pov).toBe('Alice');
    expect(chapter[0].title).toBe('Test Chapter');
  });
});
