import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const chapterInfoSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  chapter: z.number().describe('Chapter number'),
});

export async function chapterInfo(args: z.infer<typeof chapterInfoSchema>, tracker: Tracker) {
  try {
    const chapter = await tracker.getChapter(args.timeline, args.arc, args.episode, args.chapter);

    if (!chapter) {
      throw new Error(
        `Chapter not found: ${args.timeline}/${args.arc}/ep${args.episode}/ch${args.chapter}`,
      );
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
              metadata: {
                pov: chapter.pov,
                title: chapter.title,
                date: chapter.date,
                summary: chapter.summary,
                location: chapter.location,
                outfit: chapter.outfit,
                kink: chapter.kink,
              },
              stats: {
                words: chapter.words,
                characters: chapter.characters,
                charactersNoSpaces: chapter.charactersNoSpaces,
                paragraphs: chapter.paragraphs,
                sentences: chapter.sentences,
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
      `Failed to get chapter info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
