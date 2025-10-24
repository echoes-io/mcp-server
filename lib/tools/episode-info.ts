import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const episodeInfoSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
});

export async function episodeInfo(args: z.infer<typeof episodeInfoSchema>, tracker: Tracker) {
  try {
    const episode = await tracker.getEpisode(args.timeline, args.arc, args.episode);

    if (!episode) {
      throw new Error(`Episode not found: ${args.timeline}/${args.arc}/ep${args.episode}`);
    }

    const chapters = await tracker.getChapters(args.timeline, args.arc, args.episode);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline: args.timeline,
              arc: args.arc,
              episode: args.episode,
              episodeInfo: {
                description: episode.description,
              },
              chaptersCount: chapters.length,
              chapters: chapters.map((ch) => ({
                chapter: ch.number || 0,
                part: ch.partNumber || 0,
                pov: ch.pov,
                title: ch.title,
                words: ch.words,
                date: ch.date,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get episode info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
