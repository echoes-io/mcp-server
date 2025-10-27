import type { RAGSystem } from '@echoes-io/rag';
import type { Tracker } from '@echoes-io/tracker';
import { z } from 'zod';

import { getTimeline } from '../utils.js';

export const ragIndexSchema = z.object({
  arc: z.string().optional().describe('Index specific arc only'),
  episode: z.number().optional().describe('Index specific episode only (requires arc)'),
});

export async function ragIndex(
  args: z.infer<typeof ragIndexSchema>,
  tracker: Tracker,
  rag: RAGSystem,
) {
  try {
    const timeline = getTimeline();
    let chapters: Awaited<ReturnType<typeof tracker.getChapters>> = [];

    // Get chapters based on filters
    if (args.arc && args.episode) {
      chapters = await tracker.getChapters(timeline, args.arc, args.episode);
    } else if (args.arc) {
      const episodes = await tracker.getEpisodes(timeline, args.arc);
      for (const ep of episodes) {
        const epChapters = await tracker.getChapters(timeline, args.arc, ep.number);
        chapters.push(...epChapters);
      }
    } else {
      const arcs = await tracker.getArcs(timeline);
      for (const arc of arcs) {
        const episodes = await tracker.getEpisodes(timeline, arc.name);
        for (const ep of episodes) {
          const epChapters = await tracker.getChapters(timeline, arc.name, ep.number);
          chapters.push(...epChapters);
        }
      }
    }

    // Convert to embedding format and add to RAG
    const embeddingChapters = chapters.map((ch) => ({
      id: `${ch.timelineName}-${ch.arcName}-${ch.episodeNumber}-${ch.number}`,
      metadata: ch,
      content: '', // Content will be loaded by RAG system if needed
    }));

    await rag.addChapters(embeddingChapters);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              indexed: embeddingChapters.length,
              timeline,
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
