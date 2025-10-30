import type { RAGSystem } from '@echoes-io/rag';
import { z } from 'zod';

export const ragContextSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  query: z.string().describe('Context query'),
  arc: z.string().optional().describe('Filter by arc name'),
  pov: z.string().optional().describe('Filter by POV character'),
  maxChapters: z.number().optional().describe('Maximum number of chapters (default: 5)'),
});

export async function ragContext(args: z.infer<typeof ragContextSchema>, rag: RAGSystem) {
  try {
    const results = await rag.getContext({
      query: args.query,
      timeline: args.timeline,
      arc: args.arc,
      pov: args.pov,
      maxChapters: args.maxChapters,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              query: args.query,
              timeline: args.timeline,
              filters: {
                arc: args.arc || null,
                pov: args.pov || null,
              },
              context: results.map((r) => ({
                chapter: {
                  arc: r.metadata.arcName,
                  episode: r.metadata.episodeNumber,
                  chapter: r.metadata.number,
                  pov: r.metadata.pov,
                  title: r.metadata.title,
                },
                similarity: r.similarity,
                content: r.content,
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
      `Failed to get context: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
