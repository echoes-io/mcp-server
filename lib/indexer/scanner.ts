import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { ScannedChapter } from '../database/schemas.js';
import { parseChapter } from '../utils.js';

export interface ScanResult {
  chapters: ScannedChapter[];
  arcs: string[];
}

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function scanDirectory(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function scanChapter(filePath: string, basePath: string): ScannedChapter {
  const raw = readFileSync(filePath, 'utf-8');
  const { metadata, content, stats } = parseChapter(raw);

  if (!metadata.arc || !metadata.episode || !metadata.chapter || !metadata.pov || !metadata.title) {
    throw new Error(`Missing required frontmatter in ${filePath}`);
  }

  return {
    id: `${metadata.arc}:${metadata.episode}:${metadata.chapter}`,
    file_path: relative(basePath, filePath),
    file_hash: computeHash(raw),
    arc: metadata.arc,
    episode: metadata.episode,
    chapter: metadata.chapter,
    pov: metadata.pov,
    title: metadata.title,
    location: metadata.location ?? '',
    date: metadata.date ?? '',
    summary: metadata.summary ?? '',
    content,
    word_count: stats.wordCount,
    char_count: stats.charCount,
    paragraph_count: stats.paragraphCount,
  };
}

export function scanTimeline(contentPath: string, arcFilter?: string): ScanResult {
  const files = scanDirectory(contentPath, /\.md$/);
  const chapters: ScannedChapter[] = [];
  const arcsSet = new Set<string>();

  for (const file of files) {
    try {
      const chapter = scanChapter(file, contentPath);

      if (arcFilter && chapter.arc !== arcFilter) continue;

      chapters.push(chapter);
      arcsSet.add(chapter.arc);
    } catch {
      // Skip files that fail to parse
    }
  }

  chapters.sort((a, b) => {
    if (a.arc !== b.arc) return a.arc.localeCompare(b.arc);
    if (a.episode !== b.episode) return a.episode - b.episode;
    return a.chapter - b.chapter;
  });

  return {
    chapters,
    arcs: [...arcsSet].sort(),
  };
}
