import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const statsSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().optional().describe('Filter by arc name'),
  episode: z.number().optional().describe('Filter by episode number'),
  pov: z.string().optional().describe('Filter by POV character'),
});

export async function stats(args: z.infer<typeof statsSchema>, tracker: Tracker) {
  try {
    let chapters: Awaited<ReturnType<typeof tracker.getChapters>> = [];

    // Get chapters based on filters
    if (args.arc && args.episode) {
      chapters = await tracker.getChapters(args.timeline, args.arc, args.episode);
    } else if (args.arc) {
      const episodes = await tracker.getEpisodes(args.timeline, args.arc);
      for (const ep of episodes) {
        const epChapters = await tracker.getChapters(args.timeline, args.arc, ep.number);
        chapters.push(...epChapters);
      }
    } else {
      const arcs = await tracker.getArcs(args.timeline);
      for (const arc of arcs) {
        const episodes = await tracker.getEpisodes(args.timeline, arc.name);
        for (const ep of episodes) {
          const epChapters = await tracker.getChapters(args.timeline, arc.name, ep.number);
          chapters.push(...epChapters);
        }
      }
    }

    // Filter by POV if specified
    if (args.pov) {
      chapters = chapters.filter((ch) => ch.pov === args.pov);
    }

    // Calculate statistics
    const totalWords = chapters.reduce((sum, ch) => sum + ch.words, 0);
    const totalChapters = chapters.length;

    // POV distribution
    const povStats: Record<string, { chapters: number; words: number }> = {};
    for (const ch of chapters) {
      if (!povStats[ch.pov]) {
        povStats[ch.pov] = { chapters: 0, words: 0 };
      }
      povStats[ch.pov].chapters++;
      povStats[ch.pov].words += ch.words;
    }

    // Arc breakdown (if not filtered by arc)
    const arcStats: Record<string, { chapters: number; words: number; episodes: Set<number> }> = {};
    if (!args.arc) {
      for (const ch of chapters) {
        if (!arcStats[ch.arcName]) {
          arcStats[ch.arcName] = { chapters: 0, words: 0, episodes: new Set() };
        }
        arcStats[ch.arcName].chapters++;
        arcStats[ch.arcName].words += ch.words;
        arcStats[ch.arcName].episodes.add(ch.episodeNumber);
      }
    }

    // Episode breakdown (if filtered by arc but not episode)
    const episodeStats: Record<number, { chapters: number; words: number }> = {};
    if (args.arc && !args.episode) {
      for (const ch of chapters) {
        if (!episodeStats[ch.episodeNumber]) {
          episodeStats[ch.episodeNumber] = { chapters: 0, words: 0 };
        }
        episodeStats[ch.episodeNumber].chapters++;
        episodeStats[ch.episodeNumber].words += ch.words;
      }
    }

    const result: Record<string, unknown> = {
      timeline: args.timeline,
      filters: {
        arc: args.arc || null,
        episode: args.episode || null,
        pov: args.pov || null,
      },
      summary: {
        totalChapters,
        totalWords,
        averageChapterLength: totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0,
      },
      povDistribution: Object.entries(povStats).map(([pov, stats]) => ({
        pov,
        chapters: stats.chapters,
        words: stats.words,
        percentage: totalWords > 0 ? Math.round((stats.words / totalWords) * 100) : 0,
      })),
    };

    if (!args.arc && Object.keys(arcStats).length > 0) {
      result.arcBreakdown = Object.entries(arcStats).map(([arc, stats]) => ({
        arc,
        chapters: stats.chapters,
        words: stats.words,
        episodes: stats.episodes.size,
      }));
    }

    if (args.arc && !args.episode && Object.keys(episodeStats).length > 0) {
      result.episodeBreakdown = Object.entries(episodeStats).map(([episode, stats]) => ({
        episode: Number(episode),
        chapters: stats.chapters,
        words: stats.words,
      }));
    }

    if (totalChapters > 0) {
      const sortedByWords = [...chapters].sort((a, b) => b.words - a.words);
      result.extremes = {
        longest: {
          title: sortedByWords[0].title,
          pov: sortedByWords[0].pov,
          words: sortedByWords[0].words,
        },
        shortest: {
          title: sortedByWords[sortedByWords.length - 1].title,
          pov: sortedByWords[sortedByWords.length - 1].pov,
          words: sortedByWords[sortedByWords.length - 1].words,
        },
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
