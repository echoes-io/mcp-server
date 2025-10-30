import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RAGSystem } from '@echoes-io/rag';
import type { Tracker } from '@echoes-io/tracker';
import { parseMarkdown } from '@echoes-io/utils';
import { z } from 'zod';

export const ragIndexSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  contentPath: z.string().optional().describe('Path to content directory (required for indexing)'),
  arc: z.string().optional().describe('Index specific arc only'),
  episode: z.number().optional().describe('Index specific episode only (requires arc)'),
});

export async function ragIndex(
  args: z.infer<typeof ragIndexSchema>,
  tracker: Tracker,
  rag: RAGSystem,
) {
  try {
    let chapters: Awaited<ReturnType<typeof tracker.getChapters>> = [];

    // Get chapters based on filters
    if (args.arc && args.episode) {
      chapters = await tracker.getChapters(args.timeline, args.arc, args.episode);
    } else if (args.arc) {
      const episodes = await tracker.getEpisodes(args.timeline, args.arc);
      for (const ep of episodes) {
        const epChapters = await tracker.getChapters(args.timeline, args.arc, ep.number);
        chapters.push(...epChapters);
      }
    } else {
      const arcs = await tracker.getArcs(args.timeline);
      for (const arc of arcs) {
        const episodes = await tracker.getEpisodes(args.timeline, arc.name);
        for (const ep of episodes) {
          const epChapters = await tracker.getChapters(args.timeline, arc.name, ep.number);
          chapters.push(...epChapters);
        }
      }
    }

    // Convert to embedding format and add to RAG
    const embeddingChapters = chapters
      .map((ch) => {
        // If contentPath is provided, read actual file content
        if (args.contentPath) {
          try {
            // Find episode directory
            const episodeDir = `ep${String(ch.episodeNumber).padStart(2, '0')}`;
            const arcPath = join(args.contentPath, ch.arcName);
            const episodePath = readdirSync(arcPath, { withFileTypes: true })
              .filter(
                (e: { isDirectory: () => boolean; name: string }) =>
                  e.isDirectory() && e.name.startsWith(episodeDir),
              )
              .map((e: { name: string }) => join(arcPath, e.name))[0];

            if (!episodePath) {
              console.error(`Episode directory not found for ${ch.arcName}/ep${ch.episodeNumber}`);
              return null;
            }

            // Find chapter file by episode and chapter number (filename-agnostic for title/pov)
            const chapterPattern = `ep${String(ch.episodeNumber).padStart(2, '0')}-ch${String(ch.number).padStart(3, '0')}-`;
            const chapterFiles = readdirSync(episodePath).filter(
              (f: string) => f.startsWith(chapterPattern) && f.endsWith('.md'),
            );

            if (chapterFiles.length === 0) {
              console.error(
                `Chapter file not found for ${ch.arcName}/ep${ch.episodeNumber}/ch${ch.number}`,
              );
              return null;
            }

            const filePath = join(episodePath, chapterFiles[0]);
            const fileContent = readFileSync(filePath, 'utf-8');
            const { content } = parseMarkdown(fileContent);

            return {
              id: `${ch.timelineName}-${ch.arcName}-${ch.episodeNumber}-${ch.number}`,
              metadata: ch,
              content,
            };
          } catch (error) {
            console.error(
              `Error reading chapter ${ch.arcName}/ep${ch.episodeNumber}/ch${ch.number}:`,
              error,
            );
            return null;
          }
        }

        // Fallback: no content (for tests or when contentPath not provided)
        return {
          id: `${ch.timelineName}-${ch.arcName}-${ch.episodeNumber}-${ch.number}`,
          metadata: ch,
          content: '',
        };
      })
      .filter((ch) => ch !== null);

    await rag.addChapters(embeddingChapters);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              indexed: embeddingChapters.length,
              timeline: args.timeline,
              arc: args.arc || 'all',
              episode: args.episode || 'all',
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to index chapters: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
