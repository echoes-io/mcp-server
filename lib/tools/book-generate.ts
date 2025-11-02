import { generateBook } from '@echoes-io/books-generator';
import { z } from 'zod';

export const bookGenerateSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  outputPath: z.string().describe('Output PDF file path'),
  episodes: z.string().optional().describe('Comma-separated episode numbers (e.g., "1,2,3")'),
  format: z.enum(['a4', 'a5']).optional().describe('Page format (default: a4)'),
});

// Internal type that includes contentPath (injected by server)
type BookGenerateArgs = z.infer<typeof bookGenerateSchema> & { contentPath: string };

export async function bookGenerate(args: BookGenerateArgs) {
  try {
    await generateBook({
      contentPath: args.contentPath,
      outputPath: args.outputPath,
      timeline: args.timeline,
      episodes: args.episodes,
      format: args.format || 'a4',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              timeline: args.timeline,
              outputPath: args.outputPath,
              episodes: args.episodes || 'all',
              format: args.format || 'a4',
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to generate book: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
