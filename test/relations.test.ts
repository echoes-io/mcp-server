import { unlink } from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  arcs,
  chapters,
  type DatabaseType,
  episodes,
  initDatabase,
  timelines,
} from '../src/database/index.js';

describe('Database Relations', () => {
  let db: DatabaseType;
  const testDbPath = './test-relations.db';

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

  it('should create and query timeline with arcs', async () => {
    // Create test data
    const timeline = await db
      .insert(timelines)
      .values({
        name: 'Test Timeline',
      })
      .returning();

    await db.insert(arcs).values([
      { timelineId: timeline[0].id, name: 'Arc 1', slug: 'arc-1', order: 1 },
      { timelineId: timeline[0].id, name: 'Arc 2', slug: 'arc-2', order: 2 },
    ]);

    // Query timeline
    const timelineResult = await db
      .select()
      .from(timelines)
      .where(eq(timelines.id, timeline[0].id));
    expect(timelineResult).toHaveLength(1);
    expect(timelineResult[0].name).toBe('Test Timeline');

    // Query arcs for timeline
    const arcsResult = await db.select().from(arcs).where(eq(arcs.timelineId, timeline[0].id));
    expect(arcsResult).toHaveLength(2);
    expect(arcsResult[0].name).toBe('Arc 1');
    expect(arcsResult[1].name).toBe('Arc 2');
  });

  it('should create and query arc with episodes', async () => {
    // Create test data
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

    await db.insert(episodes).values([
      { arcId: arc[0].id, number: 1, title: 'Episode 1', slug: 'ep-1' },
      { arcId: arc[0].id, number: 2, title: 'Episode 2', slug: 'ep-2' },
    ]);

    // Query arc
    const arcResult = await db.select().from(arcs).where(eq(arcs.id, arc[0].id));
    expect(arcResult).toHaveLength(1);
    expect(arcResult[0].name).toBe('Test Arc');

    // Query episodes for arc
    const episodesResult = await db.select().from(episodes).where(eq(episodes.arcId, arc[0].id));
    expect(episodesResult).toHaveLength(2);
    expect(episodesResult[0].title).toBe('Episode 1');
  });

  it('should create full hierarchy', async () => {
    // Create test data
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

    const episode = await db
      .insert(episodes)
      .values({
        arcId: arc[0].id,
        number: 1,
        title: 'Test Episode',
        slug: 'test-episode',
      })
      .returning();

    await db.insert(chapters).values([
      {
        episodeId: episode[0].id,
        number: 1,
        pov: 'Alice',
        title: 'Chapter 1',
        summary: 'First chapter',
        location: 'Location 1',
      },
      {
        episodeId: episode[0].id,
        number: 2,
        pov: 'Bob',
        title: 'Chapter 2',
        summary: 'Second chapter',
        location: 'Location 2',
      },
    ]);

    // Query chapters for episode
    const chaptersResult = await db
      .select()
      .from(chapters)
      .where(eq(chapters.episodeId, episode[0].id));
    expect(chaptersResult).toHaveLength(2);
    expect(chaptersResult[0].pov).toBe('Alice');
    expect(chaptersResult[1].pov).toBe('Bob');
  });
});
