import { sql } from 'drizzle-orm';
import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Helpers
const uuidColumn = (name: string) =>
  text(name)
    .primaryKey()
    .$default(() => crypto.randomUUID());

const timestampColumn = (name: string) => text(name).default(sql`(datetime('now'))`).notNull();

// Tables
export const timelines = sqliteTable('timelines', {
  id: uuidColumn('id'),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const arcs = sqliteTable('arcs', {
  id: uuidColumn('id'),
  timelineId: text('timeline_id')
    .notNull()
    .references(() => timelines.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const episodes = sqliteTable('episodes', {
  id: uuidColumn('id'),
  arcId: text('arc_id')
    .notNull()
    .references(() => arcs.id),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const chapters = sqliteTable('chapters', {
  id: uuidColumn('id'),
  episodeId: text('episode_id')
    .notNull()
    .references(() => episodes.id),
  number: integer('number').notNull(),
  part: integer('part').notNull().default(1),
  pov: text('pov').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  location: text('location').notNull(),
  outfit: text('outfit'),
  kink: text('kink'),
  date: text('date'), // Simple text field
  stats: text('stats'), // Simple text field for JSON
  filePath: text('file_path'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const embeddings = sqliteTable('embeddings', {
  id: uuidColumn('id'),
  chapterId: text('chapter_id')
    .notNull()
    .references(() => chapters.id),
  content: text('content').notNull(),
  embedding: blob('embedding').notNull(),
  characters: text('characters'), // Simple text field for JSON array
  metadata: text('metadata'), // Simple text field for JSON
  createdAt: timestampColumn('created_at'),
});

// Types
export type Timeline = typeof timelines.$inferSelect;
export type Arc = typeof arcs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Embedding = typeof embeddings.$inferSelect;

export type NewTimeline = typeof timelines.$inferInsert;
export type NewArc = typeof arcs.$inferInsert;
export type NewEpisode = typeof episodes.$inferInsert;
export type NewChapter = typeof chapters.$inferInsert;
export type NewEmbedding = typeof embeddings.$inferInsert;
