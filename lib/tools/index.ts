import z from 'zod';

import { Database, DEFAULT_DB_PATH } from '../database/index.js';
import type { ChapterRecord, EntityRecord, RelationRecord } from '../database/schemas.js';
import { generateEmbedding } from '../indexer/embeddings.js';
import { extractEntities } from '../indexer/extractor.js';
import { scanTimeline } from '../indexer/scanner.js';
import type { ToolConfig } from '../types.js';

export const indexConfig: ToolConfig = {
  name: 'index',
  description: 'Index timeline content into the database for semantic search.',
  arguments: {
    contentPath: 'Path to the content directory.',
    arc: 'Filter by arc name (optional).',
    force: 'Force re-indexing of all chapters.',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const indexSchema = z.object({
  contentPath: z.string().describe(indexConfig.arguments.contentPath),
  arc: z.string().optional().describe(indexConfig.arguments.arc),
  force: z.boolean().optional().describe(indexConfig.arguments.force),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(indexConfig.arguments.dbPath),
});

export type IndexInput = z.infer<typeof indexSchema>;

export interface IndexOutput {
  indexed: number;
  skipped: number;
  deleted: number;
  entities: number;
  relations: number;
}

export async function index(input: IndexInput): Promise<IndexOutput> {
  const { contentPath, arc, force = false, dbPath } = indexSchema.parse(input);

  const db = new Database(dbPath);
  await db.connect();

  // 1. Scan filesystem
  const { chapters: scanned } = scanTimeline(contentPath, arc);

  // 2. Get existing hashes for incremental indexing
  const existingHashes = await db.getChapterHashes();

  // 3. Determine what needs indexing
  const toIndex = scanned.filter(
    (ch) => force || existingHashes.get(ch.file_path) !== ch.file_hash,
  );
  const skipped = scanned.length - toIndex.length;

  // 4. Collect all entities and relations
  const allEntities = new Map<string, EntityRecord>();
  const allRelations = new Map<string, RelationRecord>();

  // 5. Process chapters
  for (const chapter of toIndex) {
    // Generate embedding
    const vector = await generateEmbedding(chapter.content, db.embeddingModel);

    // Extract entities and relations
    const { entities, relations } = await extractEntities(chapter.content);

    // Build chapter record
    const chapterRecord: ChapterRecord = {
      ...chapter,
      vector,
      entities: entities.map((e) => `${chapter.arc}:${e.type}:${e.name}`),
      indexed_at: Date.now(),
    };

    await db.upsertChapters([chapterRecord]);

    // Aggregate entities
    for (const entity of entities) {
      const entityId = `${chapter.arc}:${entity.type}:${entity.name}`;
      const existing = allEntities.get(entityId);

      if (existing) {
        existing.chapters.push(chapter.id);
        existing.chapter_count++;
        // Merge aliases
        for (const alias of entity.aliases) {
          if (!existing.aliases.includes(alias)) {
            existing.aliases.push(alias);
          }
        }
      } else {
        allEntities.set(entityId, {
          id: entityId,
          arc: chapter.arc,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          aliases: entity.aliases,
          vector: [], // Will be filled later
          chapters: [chapter.id],
          chapter_count: 1,
          first_appearance: chapter.id,
          indexed_at: Date.now(),
        });
      }
    }

    // Aggregate relations
    for (const relation of relations) {
      const relationId = `${chapter.arc}:${relation.source}:${relation.type}:${relation.target}`;
      const existing = allRelations.get(relationId);

      if (existing) {
        if (!existing.chapters.includes(chapter.id)) {
          existing.chapters.push(chapter.id);
        }
      } else {
        allRelations.set(relationId, {
          id: relationId,
          arc: chapter.arc,
          source_entity: `${chapter.arc}:CHARACTER:${relation.source}`,
          target_entity: `${chapter.arc}:CHARACTER:${relation.target}`,
          type: relation.type,
          description: relation.description,
          weight: 0.5,
          chapters: [chapter.id],
          indexed_at: Date.now(),
        });
      }
    }
  }

  // 6. Generate embeddings for entities and save
  for (const entity of allEntities.values()) {
    entity.vector = await generateEmbedding(
      `${entity.name}: ${entity.description}`,
      db.embeddingModel,
    );
  }

  if (allEntities.size > 0) {
    await db.upsertEntities([...allEntities.values()]);
  }

  if (allRelations.size > 0) {
    await db.upsertRelations([...allRelations.values()]);
  }

  // 7. Delete removed chapters
  const currentPaths = new Set(scanned.map((c) => c.file_path));
  const toDelete = [...existingHashes.keys()].filter((p) => !currentPaths.has(p));
  await db.deleteChaptersByPaths(toDelete);

  db.close();

  return {
    indexed: toIndex.length,
    skipped,
    deleted: toDelete.length,
    entities: allEntities.size,
    relations: allRelations.size,
  };
}
