import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const chapterDeleteSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  chapter: z.number().describe('Chapter number'),
});

export async function chapterDelete(args: z.infer<typeof chapterDeleteSchema>, tracker: Tracker) {
  try {
    // Check if chapter exists
    const existing = await tracker.getChapter(args.timeline, args.arc, args.episode, args.chapter);

    if (!existing) {
      throw new Error(
        `Chapter not found: ${args.timeline}/${args.arc}/ep${args.episode}/ch${args.chapter}`,
      );
    }

    // Delete the chapter
    await tracker.deleteChapter(args.timeline, args.arc, args.episode, args.chapter);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline: args.timeline,
              arc: args.arc,
              episode: args.episode,
              chapter: args.chapter,
              deleted: {
                pov: existing.pov,
                title: existing.title,
                words: existing.words,
              },
              message: 'Chapter successfully deleted from database',
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to delete chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
