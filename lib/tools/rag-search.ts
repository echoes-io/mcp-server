import type { RAGSystem } from '@echoes-io/rag';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const ragSearchSchema = z.object({
  query: z.string().describe('Search query'),
  arc: z.string().optional().describe('Filter by arc name'),
  pov: z.string().optional().describe('Filter by POV character'),
  maxResults: z.number().optional().describe('Maximum number of results (default: 10)'),
});

export async function ragSearch(args: z.infer<typeof ragSearchSchema>, rag: RAGSystem) {
  try {
    const timeline = getTimeline();

    const results = await rag.search(args.query, {
      timeline,
      arc: args.arc,
      pov: args.pov,
      maxResults: args.maxResults,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              query: args.query,
              timeline,
              filters: {
                arc: args.arc || null,
                pov: args.pov || null,
              },
              results: results.map((r) => ({
                chapter: {
                  arc: r.metadata.arcName,
                  episode: r.metadata.episodeNumber,
                  chapter: r.metadata.number,
                  pov: r.metadata.pov,
                  title: r.metadata.title,
                },
                similarity: r.similarity,
                preview: r.content.substring(0, 200) + '...',
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
      `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
