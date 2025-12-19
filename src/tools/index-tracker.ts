import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { initDatabase } from '../database/index.js';
import { type ChapterRecord, DatabaseSync } from '../rag/database-sync.js';
import { parseMarkdown } from '../utils/markdown.js';

export const indexTrackerSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  contentPath: z.string().describe('Path to content directory'),
});

export type IndexTrackerInput = z.infer<typeof indexTrackerSchema>;

export interface IndexTrackerOutput {
  scanned: number;
  added: number;
  updated: number;
  deleted: number;
  timelines: number;
  arcs: number;
  episodes: number;
  chapters: number;
}

export async function indexTracker(input: IndexTrackerInput): Promise<IndexTrackerOutput> {
  const { timeline, contentPath } = indexTrackerSchema.parse(input);

  // Initialize database (use in-memory for now, or pass dbPath as parameter)
  const db = await initDatabase(':memory:');
  const dbSync = new DatabaseSync(db);

  // Scan filesystem for markdown files
  const chapterRecords: ChapterRecord[] = [];
  let scanned = 0;

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
            const content = readFileSync(fullPath, 'utf-8');
            const { metadata } = parseMarkdown(content);

            // Extract path info for fallback
            const relativePath = fullPath.replace(contentPath, '').replace(/^\//, '');
            const pathParts = relativePath.split('/');

            // Use metadata or infer from path
            const arc = metadata.arc || pathParts[0] || 'unknown';
            const episode = metadata.episode || extractEpisodeFromPath(pathParts[1]) || 1;
            const chapter = metadata.chapter || extractChapterFromFilename(entry) || 1;
            const pov = metadata.pov || 'unknown';

            chapterRecords.push({
              chapterId: crypto.randomUUID(),
              timeline,
              arc,
              episode,
              chapter,
              pov,
              title: metadata.title,
              summary: metadata.summary,
              location: metadata.location,
              filePath: fullPath,
            });

            scanned++;
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

  // Sync to database
  const syncStats = await dbSync.syncChapters(chapterRecords);

  return {
    scanned,
    added: syncStats.chapters, // New chapters added
    updated: 0, // TODO: Track updates
    deleted: 0, // TODO: Track deletions
    timelines: syncStats.timelines,
    arcs: syncStats.arcs,
    episodes: syncStats.episodes,
    chapters: syncStats.chapters,
  };
}

function extractEpisodeFromPath(pathSegment: string): number | null {
  if (!pathSegment) return null;

  // Match patterns like "ep01-title", "episode-1", "01-title"
  const match = pathSegment.match(/(?:ep|episode)?[-_]?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractChapterFromFilename(filename: string): number | null {
  // Match patterns like "ep01-ch001-title.md", "chapter-1.md", "001-title.md"
  const match = filename.match(/(?:ch|chapter)?[-_]?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}
