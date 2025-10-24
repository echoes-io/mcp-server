import { readFileSync } from 'node:fs';

import { getTextStats } from '@echoes-io/utils';
import { z } from 'zod';

export const wordsCountSchema = z.object({
  file: z.string().describe('Path to markdown file'),
});

export async function wordsCount(args: z.infer<typeof wordsCountSchema>) {
  try {
    const content = readFileSync(args.file, 'utf-8');
    const stats = getTextStats(content);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              file: args.file,
              words: stats.words,
              characters: stats.characters,
              charactersNoSpaces: stats.charactersNoSpaces,
              paragraphs: stats.paragraphs,
              sentences: stats.sentences,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to count words: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
