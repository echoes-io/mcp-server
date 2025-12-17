import { parseMarkdown, stripMarkdown } from './markdown-parser.js';
import type { TextStats } from './types.js';

export function getTextStats(markdown: string): TextStats {
  // Remove frontmatter first, then strip markdown
  const { content } = parseMarkdown(markdown);
  const plainText = stripMarkdown(content);

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
