import { z } from 'zod';

import { initDatabase } from '../database/index.js';
import { createHybridRAG } from '../rag/index.js';

export const ragSearchSchema = z.object({
  timeline: z.string().min(1, 'Timeline name is required').describe('Timeline name'),
  query: z.string().min(1, 'Query is required').describe('Search query'),
  topK: z.number().optional().default(10).describe('Maximum number of results'),
  characters: z.array(z.string()).optional().describe('Filter by character names'),
  allCharacters: z
    .boolean()
    .optional()
    .default(false)
    .describe('Require all characters (AND) vs any (OR)'),
  arc: z.string().optional().describe('Filter by arc'),
  pov: z.string().optional().describe('Filter by point of view'),
  useGraphRAG: z
    .boolean()
    .optional()
    .default(true)
    .describe('Use GraphRAG (true) or vector search only (false)'),
});

export type RagSearchInput = z.infer<typeof ragSearchSchema>;

export interface RagSearchOutput {
  results: Array<{
    id: string;
    chapterId: string;
    content: string;
    characters: string[];
    metadata: {
      arc?: string;
      episode?: number;
      chapter?: number;
      pov?: string;
      title?: string;
      location?: string;
      [key: string]: unknown;
    };
    score: number;
    source: 'graphrag' | 'vector';
  }>;
  totalResults: number;
  searchTime: number;
  source: 'graphrag' | 'vector' | 'hybrid';
}

export async function ragSearch(input: RagSearchInput): Promise<RagSearchOutput> {
  const { timeline, query, topK, characters, allCharacters, arc, pov, useGraphRAG } =
    ragSearchSchema.parse(input);

  const startTime = Date.now();

  // Initialize database and RAG system
  const db = await initDatabase(':memory:');
  const rag = createHybridRAG(db);

  // Perform search
  const results = await rag.search(query, {
    topK,
    characters,
    allCharacters,
    arc,
    pov,
    useGraphRAG,
  });

  const searchTime = Date.now() - startTime;

  // Determine primary source
  let primarySource: 'graphrag' | 'vector' | 'hybrid' = 'hybrid';
  if (results.length > 0) {
    const sources = new Set(results.map((r) => r.source));
    if (sources.size === 1) {
      primarySource = Array.from(sources)[0] as 'graphrag' | 'vector';
    }
  }

  return {
    results: results.map((result) => ({
      id: result.id,
      chapterId: result.chapterId,
      content: result.content,
      characters: result.characters,
      metadata: result.metadata as {
        arc?: string;
        episode?: number;
        chapter?: number;
        pov?: string;
        title?: string;
        location?: string;
        [key: string]: unknown;
      },
      score: result.score,
      source: result.source,
    })),
    totalResults: results.length,
    searchTime,
    source: primarySource,
  };
}
