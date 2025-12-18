/**
 * Database synchronization utilities for HybridRAG
 * Ensures timeline/arc/episode/chapter records exist before indexing
 */

import { and, eq } from 'drizzle-orm';

import type { DatabaseType } from '../database/index.js';
import { arcs, chapters, episodes, timelines } from '../database/schema.js';

export interface ChapterRecord {
  chapterId: string;
  timeline: string;
  arc: string;
  episode: number;
  chapter: number;
  pov: string;
  title?: string;
  summary?: string;
  location?: string;
  filePath?: string;
}

export class DatabaseSync {
  constructor(private db: DatabaseType) {}

  /**
   * Ensure all required database records exist for chapters
   */
  async syncChapters(chapterRecords: ChapterRecord[]): Promise<{
    timelines: number;
    arcs: number;
    episodes: number;
    chapters: number;
  }> {
    const stats = { timelines: 0, arcs: 0, episodes: 0, chapters: 0 };

    // Group by timeline, arc, episode for efficient processing
    const timelineMap = new Map<string, Set<string>>();
    const arcMap = new Map<string, Set<string>>();
    const episodeMap = new Map<string, Set<number>>();

    for (const record of chapterRecords) {
      // Timeline tracking
      if (!timelineMap.has(record.timeline)) {
        timelineMap.set(record.timeline, new Set());
      }

      // Arc tracking
      const arcKey = `${record.timeline}:${record.arc}`;
      if (!arcMap.has(arcKey)) {
        arcMap.set(arcKey, new Set());
        timelineMap.get(record.timeline)?.add(record.arc);
      }

      // Episode tracking
      const episodeKey = `${record.timeline}:${record.arc}:${record.episode}`;
      if (!episodeMap.has(episodeKey)) {
        episodeMap.set(episodeKey, new Set());
        arcMap.get(arcKey)?.add(record.episode.toString());
      }
    }

    // 1. Ensure timelines exist
    for (const timelineName of timelineMap.keys()) {
      const existing = await this.db
        .select()
        .from(timelines)
        .where(eq(timelines.name, timelineName))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(timelines).values({
          name: timelineName,
          description: `Auto-created timeline: ${timelineName}`,
        });
        stats.timelines++;
      }
    }

    // 2. Ensure arcs exist
    for (const [arcKey, _] of arcMap) {
      const [timelineName, arcName] = arcKey.split(':');

      const timelineRecord = await this.db
        .select()
        .from(timelines)
        .where(eq(timelines.name, timelineName))
        .limit(1);

      if (timelineRecord.length === 0) continue;

      const existing = await this.db
        .select()
        .from(arcs)
        .where(and(eq(arcs.timelineId, timelineRecord[0].id), eq(arcs.name, arcName)))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(arcs).values({
          timelineId: timelineRecord[0].id,
          name: arcName,
          slug: arcName.toLowerCase().replace(/\s+/g, '-'),
          order: stats.arcs + 1,
        });
        stats.arcs++;
      }
    }

    // 3. Ensure episodes exist
    for (const [episodeKey, _] of episodeMap) {
      const [timelineName, arcName, episodeNum] = episodeKey.split(':');

      const arcRecord = await this.db
        .select({ id: arcs.id })
        .from(arcs)
        .innerJoin(timelines, eq(arcs.timelineId, timelines.id))
        .where(and(eq(timelines.name, timelineName), eq(arcs.name, arcName)))
        .limit(1);

      if (arcRecord.length === 0) continue;

      const existing = await this.db
        .select()
        .from(episodes)
        .where(
          and(eq(episodes.arcId, arcRecord[0].id), eq(episodes.number, parseInt(episodeNum, 10))),
        )
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(episodes).values({
          arcId: arcRecord[0].id,
          number: parseInt(episodeNum, 10),
          title: `Episode ${episodeNum}`,
          slug: `episode-${episodeNum}`,
        });
        stats.episodes++;
      }
    }

    // 4. Ensure chapters exist
    for (const record of chapterRecords) {
      const episodeRecord = await this.db
        .select({ id: episodes.id })
        .from(episodes)
        .innerJoin(arcs, eq(episodes.arcId, arcs.id))
        .innerJoin(timelines, eq(arcs.timelineId, timelines.id))
        .where(
          and(
            eq(timelines.name, record.timeline),
            eq(arcs.name, record.arc),
            eq(episodes.number, record.episode),
          ),
        )
        .limit(1);

      if (episodeRecord.length === 0) continue;

      const existing = await this.db
        .select()
        .from(chapters)
        .where(
          and(eq(chapters.episodeId, episodeRecord[0].id), eq(chapters.number, record.chapter)),
        )
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(chapters).values({
          episodeId: episodeRecord[0].id,
          number: record.chapter,
          pov: record.pov,
          title: record.title || `Chapter ${record.chapter}`,
          summary: record.summary || '',
          location: record.location || '',
          filePath: record.filePath,
        });
        stats.chapters++;
      }
    }

    return stats;
  }

  /**
   * Get chapter ID from database for embedding insertion
   */
  async getChapterId(
    timeline: string,
    arc: string,
    episode: number,
    chapter: number,
  ): Promise<string | null> {
    const result = await this.db
      .select({ id: chapters.id })
      .from(chapters)
      .innerJoin(episodes, eq(chapters.episodeId, episodes.id))
      .innerJoin(arcs, eq(episodes.arcId, arcs.id))
      .innerJoin(timelines, eq(arcs.timelineId, timelines.id))
      .where(
        and(
          eq(timelines.name, timeline),
          eq(arcs.name, arc),
          eq(episodes.number, episode),
          eq(chapters.number, chapter),
        ),
      )
      .limit(1);

    return result.length > 0 ? result[0].id : null;
  }

  /**
   * Clean up orphaned embeddings
   */
  async cleanupEmbeddings(): Promise<number> {
    // This would require a more complex query to find orphaned embeddings
    // For now, we'll implement a simple version
    return 0;
  }
}
