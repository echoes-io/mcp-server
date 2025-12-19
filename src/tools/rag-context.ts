import { z } from 'zod';

import { initDatabase } from '../database/index.js';
import { createHybridRAG } from '../rag/index.js';

export const ragContextSchema = z.object({
  timeline: z.string().min(1, 'Timeline name is required').describe('Timeline name'),
  query: z.string().min(1, 'Query is required').describe('Search query'),
  maxChapters: z.number().optional().default(5).describe('Maximum number of chapters to return'),
  characters: z.array(z.string()).optional().describe('Filter by character names'),
  allCharacters: z
    .boolean()
    .optional()
    .default(false)
    .describe('Require all characters (AND) vs any (OR)'),
  arc: z.string().optional().describe('Filter by arc'),
  pov: z.string().optional().describe('Filter by point of view'),
});

export type RagContextInput = z.infer<typeof ragContextSchema>;

export interface RagContextOutput {
  chapters: Array<{
    id: string;
    chapterId: string;
    fullContent: string;
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
  totalChapters: number;
  searchTime: number;
  contextLength: number;
}

export async function ragContext(input: RagContextInput): Promise<RagContextOutput> {
  const { timeline, query, maxChapters, characters, allCharacters, arc, pov } =
    ragContextSchema.parse(input);

  const startTime = Date.now();

  // Initialize database and RAG system
  const db = await initDatabase(':memory:');
  const rag = createHybridRAG(db);

  // Perform search to get relevant chapters
  const searchResults = await rag.search(query, {
    topK: maxChapters,
    characters,
    allCharacters,
    arc,
    pov,
    useGraphRAG: true,
  });

  const searchTime = Date.now() - startTime;

  // Transform results to include full content for AI context
  const chapters = searchResults.map((result) => ({
    id: result.id,
    chapterId: result.chapterId,
    fullContent: result.content, // Full chapter content for AI context
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
  }));

  // Calculate total context length
  const contextLength = chapters.reduce((total, chapter) => total + chapter.fullContent.length, 0);

  return {
    chapters,
    totalChapters: chapters.length,
    searchTime,
    contextLength,
  };
}
