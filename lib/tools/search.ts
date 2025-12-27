import z from 'zod';

import { Database, DEFAULT_DB_PATH } from '../database/index.js';
import type { ChapterRecord, EntityRecord, RelationRecord } from '../database/schemas.js';
import { generateEmbedding } from '../indexer/embeddings.js';
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

// Function overloads for better type inference
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

  const db = new Database(dbPath);
  await db.connect();

  if (type === 'chapters') {
    const vector = await generateEmbedding(query, db.embeddingModel);
    const chapters = await db.searchChapters(vector, limit, arc);
    db.close();

    return {
      type: 'chapters',
      results: chapters.map((c: ChapterRecord & { _distance?: number }) => ({
        id: c.id,
        arc: c.arc,
        episode: c.episode,
        chapter: c.chapter,
        pov: c.pov,
        title: c.title,
        location: c.location,
        content: c.content.slice(0, 500) + (c.content.length > 500 ? '...' : ''),
        word_count: c.word_count,
        /* v8 ignore next */
        score: 1 - (c._distance ?? 0),
      })),
    };
  }

  if (type === 'entities') {
    const vector = await generateEmbedding(query, db.embeddingModel);
    const entities = await db.searchEntities(vector, limit, arc, entityType);
    db.close();

    return {
      type: 'entities',
      results: entities.map((e: EntityRecord & { _distance?: number }) => ({
        id: e.id,
        arc: e.arc,
        name: e.name,
        type: e.type,
        description: e.description,
        aliases: e.aliases,
        chapter_count: e.chapter_count,
        /* v8 ignore next */
        score: 1 - (e._distance ?? 0),
      })),
    };
  }

  // type === 'relations'
  const relations = await db.getRelations(arc, relationType);
  db.close();

  // Filter relations by query (simple text match on source/target/description)
  const queryLower = query.toLowerCase();
  const filtered = relations.filter(
    (r) =>
      r.source_entity.toLowerCase().includes(queryLower) ||
      r.target_entity.toLowerCase().includes(queryLower) ||
      r.description.toLowerCase().includes(queryLower),
  );

  return {
    type: 'relations',
    results: filtered.slice(0, limit).map((r: RelationRecord) => ({
      id: r.id,
      arc: r.arc,
      source_entity: r.source_entity,
      target_entity: r.target_entity,
      type: r.type,
      description: r.description,
      chapters: r.chapters,
    })),
  };
}
