import { readFileSync } from 'node:fs';

import type { Tracker } from '@echoes-io/tracker';
import { getTextStats, parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

export const chapterRefreshSchema = z.object({
  file: z.string().describe('Path to chapter markdown file'),
});

export async function chapterRefresh(args: z.infer<typeof chapterRefreshSchema>, tracker: Tracker) {
  try {
    const content = readFileSync(args.file, 'utf-8');
    const { metadata, content: markdownContent } = parseMarkdown(content);
    const stats = getTextStats(markdownContent);

    // Extract required fields from metadata
    const timeline = metadata.timeline;
    const arc = metadata.arc;
    const episode = metadata.episode;
    const chapter = metadata.chapter;

    if (!timeline || !arc || !episode || !chapter) {
      throw new Error('Missing required metadata: timeline, arc, episode, or chapter');
    }

    // Check if chapter exists
    const existing = await tracker.getChapter(timeline, arc, episode, chapter);

    if (!existing) {
      throw new Error(
        `Chapter not found in database: ${timeline}/${arc}/ep${episode}/ch${chapter}`,
      );
    }

    // Update chapter with new data
    const chapterData = {
      timelineName: timeline,
      arcName: arc,
      episodeNumber: episode,
      partNumber: metadata.part || 1,
      number: chapter,
      pov: metadata.pov || 'Unknown',
      title: metadata.title || 'Untitled',
      date: new Date(metadata.date || Date.now()),
      excerpt: metadata.excerpt || '',
      location: metadata.location || '',
      outfit: metadata.outfit || '',
      kink: metadata.kink || '',
      words: stats.words,
      characters: stats.characters,
      charactersNoSpaces: stats.charactersNoSpaces,
      paragraphs: stats.paragraphs,
      sentences: stats.sentences,
      readingTimeMinutes: Math.ceil(stats.words / 200),
    };

    await tracker.updateChapter(timeline, arc, episode, chapter, chapterData);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              file: args.file,
              timeline,
              arc,
              episode,
              chapter,
              updated: {
                metadata: {
                  pov: chapterData.pov,
                  title: chapterData.title,
                  date: chapterData.date,
                  excerpt: chapterData.excerpt,
                  location: chapterData.location,
                },
                stats: {
                  words: stats.words,
                  characters: stats.characters,
                  paragraphs: stats.paragraphs,
                  sentences: stats.sentences,
                  readingTimeMinutes: chapterData.readingTimeMinutes,
                },
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
      `Failed to refresh chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
