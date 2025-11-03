import type { RAGSystem } from '@echoes-io/rag';
import { z } from 'zod';

export const ragCharactersSchema = z.object({
  timeline: z.string().describe('Timeline name'),
  character: z.string().describe('Character name to find co-occurrences for'),
});

export async function ragCharacters(args: z.infer<typeof ragCharactersSchema>, rag: RAGSystem) {
  try {
    const characters = await rag.getCharacterMentions(args.character);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              character: args.character,
              timeline: args.timeline,
              coOccurringCharacters: characters.filter((c) => c !== args.character).sort(),
              total: characters.length - 1,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get character mentions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
