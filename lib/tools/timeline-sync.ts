import { existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import type { Tracker } from '@echoes-io/tracker';
import { getTextStats, parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

export const timelineSyncSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  contentPath: z.string().describe('Path to content directory'),
});

export async function timelineSync(args: z.infer<typeof timelineSyncSchema>, tracker: Tracker) {
  try {
    let added = 0,
      updated = 0,
      deleted = 0,
      errors = 0;

    // Ensure timeline exists
    let timeline = await tracker.getTimeline(args.timeline);
    if (!timeline) {
      timeline = await tracker.createTimeline({
        name: args.timeline,
        description: `Timeline ${args.timeline}`,
      });
      added++;
    }

    // PHASE 1: Scan filesystem and add/update chapters
    const arcs = readdirSync(args.contentPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const arcName of arcs) {
      const arcPath = join(args.contentPath, arcName);

      // Ensure arc exists
      let arc = await tracker.getArc(args.timeline, arcName);
      if (!arc) {
        arc = await tracker.createArc({
          timelineName: args.timeline,
          name: arcName,
          number: 1,
          description: `Arc ${arcName}`,
        });
        added++;
      }

      // Scan episodes
      const episodes = readdirSync(arcPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('ep'))
        .map((entry) => ({
          name: entry.name,
          number: parseInt(entry.name.match(/ep(\d+)/)?.[1] || '0'),
        }));

      for (const ep of episodes) {
        const episodePath = join(arcPath, ep.name);

        // Ensure episode exists
        let episode = await tracker.getEpisode(args.timeline, arcName, ep.number);
        if (!episode) {
          episode = await tracker.createEpisode({
            timelineName: args.timeline,
            arcName: arcName,
            number: ep.number,
            slug: ep.name,
            title: ep.name,
            description: `Episode ${ep.number}`,
          });
          added++;
        }

        // Scan chapters
        const chapters = readdirSync(episodePath)
          .filter((file) => extname(file) === '.md')
          .map((file) => {
            try {
              const filePath = join(episodePath, file);
              const content = require('fs').readFileSync(filePath, 'utf-8');
              const { metadata, content: markdownContent } = parseMarkdown(content);
              const stats = getTextStats(markdownContent);

              return {
                file: filePath,
                filename: file,
                metadata,
                stats,
              };
            } catch (error) {
              errors++;
              return null;
            }
          })
          .filter(Boolean);

        for (const chapter of chapters) {
          if (!chapter) continue;

          try {
            const chNumber = chapter.metadata?.chapter || 1;

            // Check if chapter exists
            const existing = await tracker.getChapter(args.timeline, arcName, ep.number, chNumber);

            const chapterData = {
              timelineName: args.timeline,
              arcName: arcName,
              episodeNumber: ep.number,
              partNumber: chapter.metadata?.part || 1,
              number: chNumber,
              pov: chapter.metadata?.pov || 'Unknown',
              title: chapter.metadata?.title || chapter.filename,
              date: new Date(chapter.metadata?.date || Date.now()),
              excerpt: chapter.metadata?.excerpt || '',
              location: chapter.metadata?.location || '',
              outfit: chapter.metadata?.outfit || '',
              kink: chapter.metadata?.kink || '',
              words: chapter.stats?.words || 0,
              characters: chapter.stats?.characters || 0,
              charactersNoSpaces: chapter.stats?.charactersNoSpaces || 0,
              paragraphs: chapter.stats?.paragraphs || 0,
              sentences: chapter.stats?.sentences || 0,
              readingTimeMinutes: Math.ceil((chapter.stats?.words || 0) / 200),
            };

            if (existing) {
              await tracker.updateChapter(args.timeline, arcName, ep.number, chNumber, chapterData);
              updated++;
            } else {
              await tracker.createChapter(chapterData);
              added++;
            }
          } catch (error) {
            errors++;
          }
        }
      }
    }

    // PHASE 2: Check for deleted files and remove from database
    try {
      // Get all arcs and episodes to fetch all chapters
      const dbArcs = await tracker.getArcs(args.timeline);

      for (const arc of dbArcs) {
        const dbEpisodes = await tracker.getEpisodes(args.timeline, arc.name);

        for (const episode of dbEpisodes) {
          const allChapters = await tracker.getChapters(args.timeline, arc.name, episode.number);

          for (const dbChapter of allChapters) {
            // Check if any file matching the chapter pattern exists
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
            } catch (error) {
              // If we can't check, assume file doesn't exist
              fileExists = false;
            }

            // If file doesn't exist, delete from database
            if (!fileExists) {
              try {
                await tracker.deleteChapter(
                  dbChapter.timelineName,
                  dbChapter.arcName,
                  dbChapter.episodeNumber,
                  dbChapter.number,
                );
                deleted++;
              } catch (error) {
                errors++;
              }
            }
          }
        }
      }
    } catch (error) {
      // If we can't get chapters list, skip deletion phase
      errors++;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              timeline: args.timeline,
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
