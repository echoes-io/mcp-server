import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const episodeUpdateSchema = z.object({
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  description: z.string().optional().describe('Episode description'),
  title: z.string().optional().describe('Episode title'),
  slug: z.string().optional().describe('Episode slug'),
});

export async function episodeUpdate(args: z.infer<typeof episodeUpdateSchema>, tracker: Tracker) {
  try {
    const timeline = getTimeline();
    const existing = await tracker.getEpisode(timeline, args.arc, args.episode);

    if (!existing) {
      throw new Error(`Episode not found: ${timeline}/${args.arc}/ep${args.episode}`);
    }

    const updateData: Record<string, string> = {};
    if (args.description !== undefined) updateData.description = args.description;
    if (args.title !== undefined) updateData.title = args.title;
    if (args.slug !== undefined) updateData.slug = args.slug;

    await tracker.updateEpisode(timeline, args.arc, args.episode, updateData);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline,
              arc: args.arc,
              episode: args.episode,
              updated: updateData,
              message: 'Episode successfully updated',
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to update episode: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
