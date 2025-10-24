import type { Tracker } from '@echoes-io/tracker';
import { getTextStats, parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const chapterInsertSchema = z.object({
  arc: z.string().describe('Arc name'),
  episode: z.number().describe('Episode number'),
  after: z.number().describe('Insert after this chapter number'),
  pov: z.string().describe('Point of view character'),
  title: z.string().describe('Chapter title'),
  excerpt: z.string().optional().describe('Chapter excerpt'),
  location: z.string().optional().describe('Chapter location'),
  outfit: z.string().optional().describe('Character outfit'),
  kink: z.string().optional().describe('Content tags'),
  file: z.string().optional().describe('Path to markdown file to read content from'),
});

export async function chapterInsert(args: z.infer<typeof chapterInsertSchema>, tracker: Tracker) {
  try {
    const timeline = getTimeline();
    const episode = await tracker.getEpisode(timeline, args.arc, args.episode);

    if (!episode) {
      throw new Error(`Episode not found: ${timeline}/${args.arc}/ep${args.episode}`);
    }

    const existingChapters = await tracker.getChapters(timeline, args.arc, args.episode);
    const newChapterNumber = args.after + 1;

    const chaptersToRenumber = existingChapters.filter((ch) => ch.number >= newChapterNumber);

    for (const chapter of chaptersToRenumber) {
      try {
        await tracker.updateChapter(timeline, args.arc, args.episode, chapter.number, {
          number: chapter.number + 1,
        });
      } catch (error) {
        throw new Error(
          `Failed to renumber chapter ${chapter.number}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    let words = 0;
    let characters = 0;
    let charactersNoSpaces = 0;
    let paragraphs = 0;
    let sentences = 0;

    if (args.file) {
      const { readFileSync } = await import('node:fs');
      const content = readFileSync(args.file, 'utf-8');
      const { content: markdownContent } = parseMarkdown(content);
      const stats = getTextStats(markdownContent);
      words = stats.words;
      characters = stats.characters;
      charactersNoSpaces = stats.charactersNoSpaces;
      paragraphs = stats.paragraphs;
      sentences = stats.sentences;
    }

    await tracker.createChapter({
      timelineName: timeline,
      arcName: args.arc,
      episodeNumber: args.episode,
      partNumber: 1,
      number: newChapterNumber,
      pov: args.pov,
      title: args.title,
      date: new Date(),
      excerpt: args.excerpt || '',
      location: args.location || '',
      outfit: args.outfit || '',
      kink: args.kink || '',
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      sentences,
      readingTimeMinutes: Math.ceil(words / 200),
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline,
              arc: args.arc,
              episode: args.episode,
              inserted: {
                chapter: newChapterNumber,
                pov: args.pov,
                title: args.title,
                words,
              },
              renumbered: chaptersToRenumber.map((ch) => ({
                oldNumber: ch.number,
                newNumber: ch.number + 1,
                title: ch.title,
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
      `Failed to insert chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
