import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { Database } from '../database/index.js';
import { ENTITY_TYPES, RELATION_TYPES } from '../database/schemas.js';
import type { ToolConfig } from '../types.js';

export const listConfig: ToolConfig = {
  name: 'list',
  description: 'List all entities or relations from the database.',
  arguments: {
    type: 'What to list: "entities" or "relations".',
    arc: 'Filter by arc name (optional).',
    entityType: 'Filter entities by type (optional).',
    relationType: 'Filter relations by type (optional).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const listSchema = z.object({
  type: z.enum(['entities', 'relations']).describe(listConfig.arguments.type),
  arc: z.string().optional().describe(listConfig.arguments.arc),
  entityType: z.enum(ENTITY_TYPES).optional().describe(listConfig.arguments.entityType),
  relationType: z.enum(RELATION_TYPES).optional().describe(listConfig.arguments.relationType),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(listConfig.arguments.dbPath),
});

export type ListInput = z.infer<typeof listSchema>;

export type ListOutput =
  | { type: 'entities'; results: EntityResult[] }
  | { type: 'relations'; results: RelationResult[] };

export interface EntityResult {
  id: string;
  name: string;
  type: string;
  description: string;
  aliases: string[];
  chapter_count: number;
}

export interface RelationResult {
  id: string;
  source_entity: string;
  target_entity: string;
  type: string;
  description: string;
  chapters: string[];
}

export async function list(input: ListInput): Promise<ListOutput> {
  const { type, arc, entityType, relationType, dbPath } = listSchema.parse(input);

  const db = new Database(dbPath);
  await db.connect();

  try {
    if (type === 'entities') {
      const entities = await db.getEntities(arc, entityType);
      return {
        type: 'entities',
        results: entities.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          description: e.description,
          aliases: e.aliases,
          chapter_count: e.chapter_count,
        })),
      };
    }

    const relations = await db.getRelations(arc, relationType);
    return {
      type: 'relations',
      results: relations.map((r) => ({
        id: r.id,
        source_entity: r.source_entity,
        target_entity: r.target_entity,
        type: r.type,
        description: r.description,
        chapters: r.chapters,
      })),
    };
  } finally {
    db.close();
  }
}
