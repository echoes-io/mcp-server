import { existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import type { Tracker } from '@echoes-io/tracker';
import { getTextStats, parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const timelineSyncSchema = z.object({
  contentPath: z.string().describe('Path to content directory'),
});

export async function timelineSync(args: z.infer<typeof timelineSyncSchema>, tracker: Tracker) {
  try {
    const timeline = getTimeline();
    let added = 0,
      updated = 0,
      deleted = 0,
      errors = 0;

    let timelineRecord = await tracker.getTimeline(timeline);
    if (!timelineRecord) {
      timelineRecord = await tracker.createTimeline({
        name: timeline,
        description: `Timeline ${timeline}`,
      });
      added++;
    }

    const arcs = readdirSync(args.contentPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const arcName of arcs) {
      const arcPath = join(args.contentPath, arcName);

      let arc = await tracker.getArc(timeline, arcName);
      if (!arc) {
        arc = await tracker.createArc({
          timelineName: timeline,
          name: arcName,
          number: 1,
          description: `Arc ${arcName}`,
        });
        added++;
      }

      const episodes = readdirSync(arcPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('ep'))
        .map((entry) => ({
          name: entry.name,
          number: Number.parseInt(entry.name.match(/ep(\d+)/)?.[1] || '0', 10),
        }));

      for (const ep of episodes) {
        const episodePath = join(arcPath, ep.name);

        let episode = await tracker.getEpisode(timeline, arcName, ep.number);
        if (!episode) {
          episode = await tracker.createEpisode({
            timelineName: timeline,
            arcName: arcName,
            number: ep.number,
            slug: ep.name,
            title: ep.name,
            description: `Episode ${ep.number}`,
          });
          added++;
        }

        const chapters = readdirSync(episodePath)
          .filter((file) => extname(file) === '.md')
          .map((file) => {
            try {
              const filePath = join(episodePath, file);
              const content = require('node:fs').readFileSync(filePath, 'utf-8');
              const { metadata, content: markdownContent } = parseMarkdown(content);
              const stats = getTextStats(markdownContent);

              return {
                file: filePath,
                metadata,
                stats,
              };
            } catch (_error) {
              errors++;
              return null;
            }
          })
          .filter((ch) => ch !== null);

        for (const chapterData of chapters) {
          if (!chapterData) continue;

          const chNumber = chapterData.metadata.chapter;
          if (!chNumber) continue;

          try {
            const existing = await tracker.getChapter(timeline, arcName, ep.number, chNumber);

            const data = {
              timelineName: timeline,
              arcName: arcName,
              episodeNumber: ep.number,
              partNumber: chapterData.metadata.part || 1,
              number: chNumber,
              pov: chapterData.metadata.pov || 'Unknown',
              title: chapterData.metadata.title || 'Untitled',
              date: new Date(chapterData.metadata.date || Date.now()),
              excerpt: chapterData.metadata.excerpt || '',
              location: chapterData.metadata.location || '',
              outfit: chapterData.metadata.outfit || '',
              kink: chapterData.metadata.kink || '',
              words: chapterData.stats.words,
              characters: chapterData.stats.characters,
              charactersNoSpaces: chapterData.stats.charactersNoSpaces,
              paragraphs: chapterData.stats.paragraphs,
              sentences: chapterData.stats.sentences,
              readingTimeMinutes: Math.ceil(chapterData.stats.words / 200),
            };

            if (existing) {
              await tracker.updateChapter(timeline, arcName, ep.number, chNumber, data);
              updated++;
            } else {
              await tracker.createChapter(data);
              added++;
            }
          } catch (_error) {
            errors++;
          }
        }
      }
    }

    try {
      const dbArcs = await tracker.getArcs(timeline);

      for (const arc of dbArcs) {
        const dbEpisodes = await tracker.getEpisodes(timeline, arc.name);

        for (const episode of dbEpisodes) {
          const allChapters = await tracker.getChapters(timeline, arc.name, episode.number);

          for (const dbChapter of allChapters) {
            let fileExists = false;
            try {
              const arcPath = join(args.contentPath, dbChapter.arcName);
              if (existsSync(arcPath)) {
                const episodeDirs = readdirSync(arcPath, { withFileTypes: true }).filter(
                  (entry) =>
                    entry.isDirectory() &&
                    entry.name.startsWith(
                      `ep${dbChapter.episodeNumber.toString().padStart(2, '0')}-`,
                    ),
                );

                for (const episodeDir of episodeDirs) {
                  const episodePath = join(arcPath, episodeDir.name);
                  const chapterFiles = readdirSync(episodePath).filter(
                    (file) =>
                      file.includes(`ch${dbChapter.number.toString().padStart(3, '0')}`) &&
                      file.endsWith('.md'),
                  );

                  if (chapterFiles.length > 0) {
                    fileExists = true;
                    break;
                  }
                }
              }
            } catch (_error) {
              fileExists = false;
            }

            if (!fileExists) {
              try {
                await tracker.deleteChapter(
                  dbChapter.timelineName,
                  dbChapter.arcName,
                  dbChapter.episodeNumber,
                  dbChapter.number,
                );
                deleted++;
              } catch (_error) {
                errors++;
              }
            }
          }
        }
      }
    } catch (_error) {
      errors++;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline,
              contentPath: args.contentPath,
              summary: {
                added,
                updated,
                deleted,
                errors,
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
      `Failed to sync timeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
