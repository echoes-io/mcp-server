import { unlinkSync } from 'node:fs';

import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const chapterDeleteSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  chapter: z.number().describe('Chapter number'),
  file: z.string().optional().describe('Path to markdown file to delete from filesystem'),
});

export async function chapterDelete(args: z.infer<typeof chapterDeleteSchema>, tracker: Tracker) {
  try {
    const existing = await tracker.getChapter(args.timeline, args.arc, args.episode, args.chapter);

    if (!existing) {
      throw new Error(
        `Chapter not found: ${args.timeline}/${args.arc}/ep${args.episode}/ch${args.chapter}`,
      );
    }

    await tracker.deleteChapter(args.timeline, args.arc, args.episode, args.chapter);

    let fileDeleted = false;
    if (args.file) {
      unlinkSync(args.file);
      fileDeleted = true;
    }

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
              fileDeleted,
              message: fileDeleted
                ? 'Chapter deleted from database and filesystem'
                : 'Chapter deleted from database only',
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
