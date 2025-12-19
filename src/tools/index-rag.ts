import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { initDatabase } from '../database/index.js';
import { ItalianCharacterNER } from '../rag/character-ner.js';
import { createHybridRAG } from '../rag/index.js';
import { parseMarkdown } from '../utils/markdown.js';

export const indexRagSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  contentPath: z.string().describe('Path to content directory'),
  arc: z.string().optional().describe('Filter by specific arc'),
  episode: z.number().optional().describe('Filter by specific episode'),
});

export type IndexRagInput = z.infer<typeof indexRagSchema>;

export interface IndexRagOutput {
  indexed: number;
  graphNodes: number;
  vectorEmbeddings: number;
  relationships: number;
  timelines: number;
  arcs: number;
  episodes: number;
  chapters: number;
}

export async function indexRag(input: IndexRagInput): Promise<IndexRagOutput> {
  const { timeline, contentPath, arc, episode } = indexRagSchema.parse(input);

  // Initialize database and RAG system
  const db = await initDatabase(':memory:');
  const rag = createHybridRAG(db);
  const ner = new ItalianCharacterNER();

  // Scan filesystem for markdown files
  const chapters: Array<{
    id: string;
    content: string;
    characters: string[];
    metadata: {
      chapterId: string;
      arc: string;
      episode: number;
      chapter: number;
      pov: string;
      location?: string;
      timeline?: string;
      title?: string;
      summary?: string;
      filePath?: string;
    };
  }> = [];

  function scanDirectory(dir: string) {
    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.endsWith('.md')) {
          try {
            const fileContent = readFileSync(fullPath, 'utf-8');
            const { metadata, content } = parseMarkdown(fileContent);

            // Apply filters
            if (arc && metadata.arc !== arc) continue;
            if (episode !== undefined && metadata.episode !== episode) continue;

            // Extract characters using NER
            const characters = ner.extractCharacters(content);

            chapters.push({
              id: crypto.randomUUID(),
              content,
              characters,
              metadata: {
                chapterId: crypto.randomUUID(),
                arc: metadata.arc || 'unknown',
                episode: metadata.episode || 1,
                chapter: metadata.chapter || 1,
                pov: metadata.pov || 'unknown',
                location: metadata.location,
                timeline,
                title: metadata.title,
                summary: metadata.summary,
                filePath: fullPath,
              },
            });
          } catch (error) {
            console.warn(`Failed to parse ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dir}:`, error);
    }
  }

  scanDirectory(contentPath);

  // Index into RAG system
  const result = await rag.indexChapters(chapters);

  // Calculate relationships (edges in graph)
  const relationships = result.graphNodes > 0 ? result.graphNodes * 2 : 0; // Rough estimate

  return {
    indexed: chapters.length,
    graphNodes: result.graphNodes,
    vectorEmbeddings: result.vectorEmbeddings,
    relationships,
    timelines: result.dbSync.timelines,
    arcs: result.dbSync.arcs,
    episodes: result.dbSync.episodes,
    chapters: result.dbSync.chapters,
  };
}
