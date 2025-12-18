import removeMd from 'remove-markdown';

import type { ChapterMetadata, ParsedMarkdown, TextStats } from '../types/frontmatter.js';

/**
 * Markdown parsing utilities
 */

export function parseMarkdown(markdown: string): ParsedMarkdown {
  const matter = require('gray-matter');
  const { data, content } = matter(markdown);

  // Convert Date objects to strings
  if (data.date instanceof Date) {
    data.date = data.date.toISOString().split('T')[0];
  }

  return {
    metadata: data as ChapterMetadata,
    content: content.trim(),
  };
}

export function getTextStats(markdown: string): TextStats {
  const { content } = parseMarkdown(markdown);

  // Strip markdown
  const withoutHeaders = content.replace(/^#{1,6}\s+.*$/gm, '');
  const plainText = removeMd(withoutHeaders);

  const words = plainText.trim().match(/\b\w+\b/g)?.length || 0;
  const characters = plainText.length;
  const charactersNoSpaces = plainText.replace(/\s/g, '').length;
  const paragraphs = plainText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const sentences = plainText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const readingTimeMinutes = Math.ceil(words / 200);

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs,
    sentences,
    readingTimeMinutes,
  };
}
