import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const episodeInfoSchema = z.object({
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
});

export async function episodeInfo(args: z.infer<typeof episodeInfoSchema>, tracker: Tracker) {
  try {
    const timeline = getTimeline();
    const episode = await tracker.getEpisode(timeline, args.arc, args.episode);

    if (!episode) {
      throw new Error(`Episode not found: ${timeline}/${args.arc}/ep${args.episode}`);
    }

    const chapters = await tracker.getChapters(timeline, args.arc, args.episode);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline,
              arc: args.arc,
              episodeInfo: {
                number: episode.number,
                title: episode.title,
                slug: episode.slug,
                description: episode.description,
              },
              chapters: chapters.map((ch) => ({
                number: ch.number,
                pov: ch.pov,
                title: ch.title,
                words: ch.words,
              })),
              stats: {
                totalChapters: chapters.length,
                totalWords: chapters.reduce((sum, ch) => sum + ch.words, 0),
              },
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
