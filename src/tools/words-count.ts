import { readFileSync } from 'node:fs';

import { z } from 'zod';

import { parseMarkdown } from '../utils/markdown.js';

export const wordsCountSchema = z.object({
  filePath: z.string().describe('Path to the markdown file'),
  detailed: z.boolean().optional().describe('Include detailed statistics'),
});

export type WordsCountInput = z.infer<typeof wordsCountSchema>;

export interface WordsCountOutput {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  readingTimeMinutes: number;
  sentences?: number;
  paragraphs?: number;
}

export async function wordsCount(input: WordsCountInput): Promise<WordsCountOutput> {
  const { filePath, detailed = false } = wordsCountSchema.parse(input);

  const content = readFileSync(filePath, 'utf-8');
  const { content: text } = parseMarkdown(content);

  // Basic stats
  const words = text.split(/\s+/).filter((word) => word.length > 0).length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const readingTimeMinutes = Math.ceil(words / 200); // 200 WPM average

  const result: WordsCountOutput = {
    words,
    characters,
    charactersNoSpaces,
    readingTimeMinutes,
  };

  if (detailed) {
    result.sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    result.paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  }

  return result;
}
