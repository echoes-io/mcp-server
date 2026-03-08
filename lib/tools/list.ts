import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import { ENTITY_TYPES, RELATION_TYPES } from '../rag/schema.js';
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

  const { storage } = createEchoesRAG({ dbPath, arc });

  if (type === 'entities') {
    const entities = await storage.graph.getEntities(entityType ? { type: entityType } : undefined);
    return {
      type: 'entities',
      results: entities.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description,
        aliases: (e.fields?.aliases as string[]) ?? [],
        chapter_count: e.sourceChunkIds.length,
      })),
    };
  }

  // type === 'relations'
  const entities = await storage.graph.getEntities();
  const seen = new Set<string>();
  const results: RelationResult[] = [];

  for (const entity of entities) {
    const rels = await storage.graph.getRelations(entity.id, 'out');
    for (const r of rels) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (relationType && r.type !== relationType) continue;
      results.push({
        id: r.id,
        source_entity: r.sourceId,
        target_entity: r.targetId,
        type: r.type,
        description: r.description,
        chapters: r.sourceChunkIds ?? [],
      });
    }
  }

  return { type: 'relations', results };
}
