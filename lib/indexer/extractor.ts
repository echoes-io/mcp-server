import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { ENTITY_TYPES, RELATION_TYPES } from '../database/schemas.js';

// Zod schemas for extraction
const ExtractedEntitySchema = z.object({
  name: z.string().describe('The canonical name of the entity'),
  type: z.enum(ENTITY_TYPES).describe('The type of entity'),
  description: z.string().describe('A brief description of the entity in context'),
  aliases: z.array(z.string()).describe('Alternative names or nicknames'),
});

const ExtractedRelationSchema = z.object({
  source: z.string().describe('Name of the source entity'),
  target: z.string().describe('Name of the target entity'),
  type: z.enum(RELATION_TYPES).describe('The type of relationship'),
  description: z.string().describe('A brief description of the relationship'),
});

const ExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  relations: z.array(ExtractedRelationSchema),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type ExtractedRelation = z.infer<typeof ExtractedRelationSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const EXTRACTION_PROMPT = `Analyze the following narrative text and extract:

1. ENTITIES: Characters, locations, events, objects, and emotions that are significant to the story.
   - Use the character's most common name as the canonical name
   - Include nicknames and alternative names as aliases
   - Provide a brief description based on what's revealed in this text

2. RELATIONS: Relationships between entities.
   - Only include relationships that are explicitly shown or strongly implied
   - Use the canonical entity names for source and target

Focus on narrative-relevant information. Be concise but accurate.

TEXT:
`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

export interface ExtractorConfig {
  model?: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

export async function extractEntities(
  content: string,
  config?: ExtractorConfig,
): Promise<ExtractionResult> {
  const ai = getClient();
  const model = config?.model ?? process.env.ECHOES_GEMINI_MODEL ?? DEFAULT_MODEL;

  const response = await ai.models.generateContent({
    model,
    contents: EXTRACTION_PROMPT + content,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(ExtractionResultSchema),
    },
  });

  const text = response.text;
  if (!text) {
    return { entities: [], relations: [] };
  }

  return ExtractionResultSchema.parse(JSON.parse(text));
}

export function resetClient(): void {
  client = null;
}
