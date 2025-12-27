import { Field, FixedSizeList, Float32, Float64, Int32, List, Schema, Utf8 } from 'apache-arrow';

// Entity and Relation type constants
export const ENTITY_TYPES = ['CHARACTER', 'LOCATION', 'EVENT', 'OBJECT', 'EMOTION'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RELATION_TYPES = [
  'LOVES',
  'HATES',
  'KNOWS',
  'RELATED_TO',
  'FRIENDS_WITH',
  'ENEMIES_WITH',
  'LOCATED_IN',
  'LIVES_IN',
  'TRAVELS_TO',
  'HAPPENS_BEFORE',
  'HAPPENS_AFTER',
  'CAUSES',
  'OWNS',
  'USES',
  'SEEKS',
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

// Dynamic Arrow Schema factories
export function createChapterSchema(embeddingDim: number): Schema {
  return new Schema([
    new Field('id', new Utf8(), false),
    new Field('file_path', new Utf8(), false),
    new Field('file_hash', new Utf8(), false),
    new Field('arc', new Utf8(), false),
    new Field('episode', new Int32(), false),
    new Field('chapter', new Int32(), false),
    new Field('pov', new Utf8(), false),
    new Field('title', new Utf8(), false),
    new Field('location', new Utf8(), false),
    new Field('date', new Utf8(), false),
    new Field('content', new Utf8(), false),
    new Field('summary', new Utf8(), false),
    new Field('word_count', new Int32(), false),
    new Field('char_count', new Int32(), false),
    new Field('paragraph_count', new Int32(), false),
    new Field('vector', new FixedSizeList(embeddingDim, new Field('item', new Float32())), false),
    new Field('entities', new List(new Field('item', new Utf8())), false),
    new Field('indexed_at', new Float64(), false),
  ]);
}

export function createEntitySchema(embeddingDim: number): Schema {
  return new Schema([
    new Field('id', new Utf8(), false),
    new Field('arc', new Utf8(), false),
    new Field('name', new Utf8(), false),
    new Field('type', new Utf8(), false),
    new Field('description', new Utf8(), false),
    new Field('aliases', new List(new Field('item', new Utf8())), false),
    new Field('vector', new FixedSizeList(embeddingDim, new Field('item', new Float32())), false),
    new Field('chapters', new List(new Field('item', new Utf8())), false),
    new Field('chapter_count', new Int32(), false),
    new Field('first_appearance', new Utf8(), false),
    new Field('indexed_at', new Float64(), false),
  ]);
}

export const RelationSchema = new Schema([
  new Field('id', new Utf8(), false),
  new Field('arc', new Utf8(), false),
  new Field('source_entity', new Utf8(), false),
  new Field('target_entity', new Utf8(), false),
  new Field('type', new Utf8(), false),
  new Field('description', new Utf8(), false),
  new Field('weight', new Float64(), false),
  new Field('chapters', new List(new Field('item', new Utf8())), false),
  new Field('indexed_at', new Float64(), false),
]);

// TypeScript interfaces

// Base chapter data from scanner (without RAG fields)
export interface ScannedChapter {
  id: string;
  file_path: string;
  file_hash: string;
  arc: string;
  episode: number;
  chapter: number;
  pov: string;
  title: string;
  location: string;
  date: string;
  content: string;
  summary: string;
  word_count: number;
  char_count: number;
  paragraph_count: number;
}

// Full chapter record with RAG fields for database
export interface ChapterRecord extends ScannedChapter {
  vector: number[];
  entities: string[];
  indexed_at: number;
}

export interface EntityRecord {
  id: string;
  arc: string;
  name: string;
  type: EntityType;
  description: string;
  aliases: string[];
  vector: number[];
  chapters: string[];
  chapter_count: number;
  first_appearance: string;
  indexed_at: number;
}

export interface RelationRecord {
  id: string;
  arc: string;
  source_entity: string;
  target_entity: string;
  type: RelationType;
  description: string;
  weight: number;
  chapters: string[];
  indexed_at: number;
}
