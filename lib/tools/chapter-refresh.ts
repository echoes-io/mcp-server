import { readFileSync } from 'node:fs';

import type { Tracker } from '@echoes-io/tracker';
import { getTextStats, parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const chapterRefreshSchema = z.object({
  file: z.string().describe('Path to chapter markdown file'),
});

export async function chapterRefresh(args: z.infer<typeof chapterRefreshSchema>, tracker: Tracker) {
  try {
    const content = readFileSync(args.file, 'utf-8');
    const { metadata, content: markdownContent } = parseMarkdown(content);
    const stats = getTextStats(markdownContent);

    const timeline = getTimeline();
    const arc = metadata.arc;
    const episode = metadata.episode;
    const chapter = metadata.chapter;

    if (!arc || !episode || !chapter) {
      throw new Error('Missing required metadata: arc, episode, or chapter');
    }

    const existing = await tracker.getChapter(timeline, arc, episode, chapter);

    if (!existing) {
      throw new Error(
        `Chapter not found in database: ${timeline}/${arc}/ep${episode}/ch${chapter}`,
      );
    }

    const chapterData = {
      timelineName: timeline,
      arcName: arc,
      episodeNumber: episode,
      partNumber: metadata.part || 1,
      number: chapter,
      pov: metadata.pov || 'Unknown',
      title: metadata.title || 'Untitled',
      date: new Date(metadata.date || Date.now()).toISOString(),
      summary: metadata.summary || '',
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
                  summary: chapterData.summary,
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
