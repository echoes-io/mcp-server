import { readFileSync } from 'node:fs';

import z from 'zod';

import type { ToolConfig } from '../types.js';
import { parseChapter } from '../utils.js';

export const wordsCountConfig: ToolConfig = {
  name: 'words-count',
  description: 'Counts the number of words in a given text file.',
  arguments: {
    filePath: 'Path to the text file to be analyzed.',
    detailed: 'Include detailed statistics.',
  },
};

export const wordsCountSchema = z.object({
  filePath: z.string().describe(wordsCountConfig.arguments.filePath),
  detailed: z.boolean().optional().describe(wordsCountConfig.arguments.detailed),
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

export function wordsCount(input: WordsCountInput): WordsCountOutput {
  const { filePath, detailed = false } = wordsCountSchema.parse(input);

  const { stats } = parseChapter(readFileSync(filePath, 'utf-8'));

  const result: WordsCountOutput = {
    words: stats.wordCount,
    characters: stats.charCountWithSpaces,
    charactersNoSpaces: stats.charCount,
    readingTimeMinutes: stats.readingTimeMinutes,
  };

  if (detailed) {
    result.sentences = stats.sentenceCount;
    result.paragraphs = stats.paragraphCount;
  }

  return result;
}
