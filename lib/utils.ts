import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import matter from 'gray-matter';
import removeMd from 'remove-markdown';

import type { ChapterMetadata, Package, ParsedMarkdown } from './types.js';

export function getPackageConfig(): Package {
  const packagePath = join(import.meta.dirname, '..', 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf8')) as Package;
}

export interface TextStats {
  wordCount: number;
  charCount: number;
  charCountWithSpaces: number;
  paragraphCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;
}

export interface ParsedChapter {
  metadata: ChapterMetadata;
  content: string;
  plainText: string;
  stats: TextStats;
}

export function parseMarkdown(markdown: string): ParsedMarkdown {
  const { data, content } = matter(markdown);

  if (data.date instanceof Date) {
    data.date = data.date.toISOString().split('T')[0];
  }

  return {
    metadata: data as ChapterMetadata,
    content: content.trim(),
  };
}

export function parseChapter(markdown: string): ParsedChapter {
  const { metadata, content } = parseMarkdown(markdown);

  // Strip markdown to plain text
  const withoutHeaders = content.replace(/^#{1,6}\s+.*$/gm, '');
  const plainText = removeMd(withoutHeaders);

  // Compute all stats
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    metadata,
    content,
    plainText,
    stats: {
      wordCount,
      charCount: plainText.replace(/\s/g, '').length,
      charCountWithSpaces: plainText.length,
      paragraphCount: plainText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length,
      sentenceCount: plainText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
      readingTimeMinutes: Math.ceil(wordCount / 200),
    },
  };
}
