import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

export const chapterInsertSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  after: z.number().describe('Insert after this chapter number'),
  pov: z.string().describe('Point of view character'),
  title: z.string().describe('Chapter title'),
  excerpt: z.string().optional().describe('Chapter excerpt'),
  location: z.string().optional().describe('Scene location'),
});

export async function chapterInsert(args: z.infer<typeof chapterInsertSchema>, tracker: Tracker) {
  try {
    // Verify episode exists
    const episode = await tracker.getEpisode(args.timeline, args.arc, args.episode);
    if (!episode) {
      throw new Error(`Episode not found: ${args.timeline}/${args.arc}/ep${args.episode}`);
    }

    // Get all chapters in the episode, sorted by number
    const allChapters = await tracker.getChapters(args.timeline, args.arc, args.episode);
    const sortedChapters = allChapters.sort((a, b) => a.number - b.number);

    // Find chapters that need to be renumbered (number > after)
    const chaptersToRenumber = sortedChapters.filter((ch) => ch.number > args.after);

    const renumbered: Array<{ old: number; new: number; title: string }> = [];

    // Renumber chapters from highest to lowest to avoid conflicts
    for (const chapter of chaptersToRenumber.reverse()) {
      const oldNumber = chapter.number;
      const newNumber = oldNumber + 1;

      try {
        await tracker.updateChapter(args.timeline, args.arc, args.episode, oldNumber, {
          ...chapter,
          number: newNumber,
        });

        renumbered.push({
          old: oldNumber,
          new: newNumber,
          title: chapter.title,
        });
      } catch (error) {
        throw new Error(
          `Failed to renumber chapter ${oldNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Create the new chapter
    const newChapterNumber = args.after + 1;
    const newChapterData = {
      timelineName: args.timeline,
      arcName: args.arc,
      episodeNumber: args.episode,
      partNumber: 1, // Default part
      number: newChapterNumber,
      pov: args.pov,
      title: args.title,
      date: new Date(),
      excerpt: args.excerpt || '',
      location: args.location || '',
      outfit: '',
      kink: '',
      words: 0, // Placeholder chapter starts with 0 words
      characters: 0,
      charactersNoSpaces: 0,
      paragraphs: 0,
      sentences: 0,
      readingTimeMinutes: 0,
    };

    await tracker.createChapter(newChapterData);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              inserted: {
                timeline: args.timeline,
                arc: args.arc,
                episode: args.episode,
                chapter: newChapterNumber,
                pov: args.pov,
                title: args.title,
              },
              renumbered: renumbered.reverse(), // Show in ascending order
              summary: {
                chaptersRenumbered: renumbered.length,
                newTotalChapters: sortedChapters.length + 1,
              },
              message: `Chapter inserted successfully. ${renumbered.length} chapters renumbered.`,
              warning:
                renumbered.length > 0
                  ? 'Remember to rename corresponding files in filesystem if they exist'
                  : undefined,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to insert chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
