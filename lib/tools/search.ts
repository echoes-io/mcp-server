import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import type { ToolConfig } from '../types.js';

export const searchConfig: ToolConfig = {
  name: 'search',
  description: 'Search indexed content using semantic similarity or filters.',
  arguments: {
    query: 'Search query text.',
    type: 'Search type: chapters (default), entities, or relations.',
    arc: 'Filter by arc name (optional).',
    entityType: 'Filter entities by type: CHARACTER, LOCATION, EVENT, OBJECT, EMOTION.',
    relationType: 'Filter relations by type.',
    limit: 'Maximum number of results (default: 10).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const searchSchema = z.object({
  query: z.string().describe(searchConfig.arguments.query),
  type: z
    .enum(['chapters', 'entities', 'relations'])
    .default('chapters')
    .describe(searchConfig.arguments.type),
  arc: z.string().optional().describe(searchConfig.arguments.arc),
  entityType: z.string().optional().describe(searchConfig.arguments.entityType),
  relationType: z.string().optional().describe(searchConfig.arguments.relationType),
  limit: z.number().optional().default(10).describe(searchConfig.arguments.limit),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(searchConfig.arguments.dbPath),
});

export type SearchInput = {
  query: string;
  type?: 'chapters' | 'entities' | 'relations';
  arc?: string;
  entityType?: string;
  relationType?: string;
  limit?: number;
  dbPath?: string;
};

export interface ChapterResult {
  id: string;
  arc: string;
  episode: number;
  chapter: number;
  pov: string;
  title: string;
  location: string;
  content: string;
  word_count: number;
  score: number;
}

export interface EntityResult {
  id: string;
  arc: string;
  name: string;
  type: string;
  description: string;
  aliases: string[];
  chapter_count: number;
  score: number;
}

export interface RelationResult {
  id: string;
  arc: string;
  source_entity: string;
  target_entity: string;
  type: string;
  description: string;
  chapters: string[];
}

export type SearchOutput =
  | { type: 'chapters'; results: ChapterResult[] }
  | { type: 'entities'; results: EntityResult[] }
  | { type: 'relations'; results: RelationResult[] };

export async function search(
  input: SearchInput & { type: 'chapters' },
): Promise<{ type: 'chapters'; results: ChapterResult[] }>;
export async function search(
  input: SearchInput & { type: 'entities' },
): Promise<{ type: 'entities'; results: EntityResult[] }>;
export async function search(
  input: SearchInput & { type: 'relations' },
): Promise<{ type: 'relations'; results: RelationResult[] }>;
export async function search(input: SearchInput): Promise<SearchOutput>;
export async function search(input: SearchInput): Promise<SearchOutput> {
  const { query, type, arc, entityType, relationType, limit, dbPath } = searchSchema.parse(input);

  const { rag, storage } = createEchoesRAG({ dbPath, arc });

  if (type === 'chapters') {
    const results = await rag.search(query, { limit });
    return {
      type: 'chapters',
      results: results.map((r) => {
        const m = r.metadata ?? {};
        const content = String(m.content ?? r.content ?? '');
        return {
          id: String(m.documentId ?? r.id),
          arc: arc ?? String(m.arc ?? m.__ns ?? ''),
          episode: Number(m.episode ?? 0),
          chapter: Number(m.chapter ?? 0),
          pov: String(m.pov ?? ''),
          title: String(m.title ?? ''),
          location: String(m.location ?? ''),
          content: content.length > 500 ? `${content.slice(0, 500)}...` : content,
          word_count: Number(m.word_count ?? 0),
          score: r.score,
        };
      }),
    };
  }

  if (type === 'entities') {
    const results = await rag.searchEntities(query, { limit, type: entityType });
    return {
      type: 'entities',
      results: results.map((r) => ({
        id: r.entity.id,
        arc: arc ?? extractArc(r.entity.id),
        name: r.entity.name,
        type: r.entity.type,
        description: r.entity.description,
        aliases: (r.entity.fields?.aliases as string[]) ?? [],
        chapter_count: r.entity.sourceChunkIds.length,
        score: r.score,
      })),
    };
  }

  // type === 'relations'
  const entities = await storage.graph.getEntities();
  const allRelations = await collectRelations(entities, storage, relationType);

  const queryLower = query.toLowerCase();
  const filtered = allRelations.filter(
    (r) =>
      r.source_entity.toLowerCase().includes(queryLower) ||
      r.target_entity.toLowerCase().includes(queryLower) ||
      r.description.toLowerCase().includes(queryLower),
  );

  return {
    type: 'relations',
    results: filtered.slice(0, limit).map((r) => ({
      ...r,
      arc: arc ?? extractArc(r.id),
    })),
  };
}

function extractArc(namespacedId: string): string {
  const i = namespacedId.indexOf(':');
  return i >= 0 ? namespacedId.slice(0, i) : '';
}

async function collectRelations(
  entities: { id: string }[],
  storage: {
    graph: {
      getRelations(
        id: string,
        dir?: string,
      ): Promise<
        {
          id: string;
          sourceId: string;
          targetId: string;
          type: string;
          description: string;
          sourceChunkIds?: string[];
        }[]
      >;
    };
  },
  typeFilter?: string,
) {
  const seen = new Set<string>();
  const results: RelationResult[] = [];

  for (const entity of entities) {
    const rels = await storage.graph.getRelations(entity.id, 'out');
    for (const r of rels) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (typeFilter && r.type !== typeFilter) continue;
      results.push({
        id: r.id,
        arc: '',
        source_entity: r.sourceId,
        target_entity: r.targetId,
        type: r.type,
        description: r.description,
        chapters: r.sourceChunkIds ?? [],
      });
    }
  }

  return results;
}
