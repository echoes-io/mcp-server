import { Listr, type ListrTask, PRESET_TIMER } from 'listr2';

import { Database } from '../database/index.js';
import type {
  ChapterRecord,
  EntityRecord,
  RelationRecord,
  ScannedChapter,
} from '../database/schemas.js';
import { generateEmbedding, preloadModel } from './embeddings.js';
import { extractEntities } from './extractor.js';
import { scanTimeline } from './scanner.js';

export interface IndexTasksInput {
  contentPath: string;
  arc?: string;
  force?: boolean;
  dbPath: string;
}

export interface IndexTasksContext {
  // Input
  contentPath: string;
  arc?: string;
  force: boolean;
  dbPath: string;
  // State
  db: Database;
  scanned: ScannedChapter[];
  toIndex: ScannedChapter[];
  toDelete: string[];
  entities: Map<string, EntityRecord>;
  relations: Map<string, RelationRecord>;
  processedCount: number;
}

export interface IndexTasksOutput {
  indexed: number;
  skipped: number;
  deleted: number;
  entities: number;
  relations: number;
}

// Progress bar helpers
export function formatProgressBar(current: number, total: number, width = 30): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${current}/${total} (${Math.round(pct * 100)}%)`;
}

export function formatEta(startTime: number, current: number, total: number): string {
  if (current === 0) return 'calculating...';
  const elapsed = Date.now() - startTime;
  const msPerItem = elapsed / current;
  const remaining = msPerItem * (total - current);
  const minutes = Math.ceil(remaining / 60000);
  if (minutes > 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function createTasks(): ListrTask<IndexTasksContext>[] {
  return [
    {
      title: 'Loading embedding model',
      task: async (ctx, task) => {
        task.title = `Loading embedding model (${ctx.db.embeddingModel})`;
        await preloadModel(ctx.db.embeddingModel);
      },
    },
    {
      title: 'Scanning filesystem',
      task: async (ctx, task) => {
        const { chapters } = scanTimeline(ctx.contentPath, ctx.arc);
        ctx.scanned = chapters;

        const existingHashes = await ctx.db.getChapterHashes();
        ctx.toIndex = chapters.filter(
          (ch) => ctx.force || existingHashes.get(ch.file_path) !== ch.file_hash,
        );

        const currentPaths = new Set(chapters.map((c) => c.file_path));
        ctx.toDelete = [...existingHashes.keys()].filter((p) => !currentPaths.has(p));

        task.title = `Scanning filesystem (${chapters.length} chapters, ${ctx.toIndex.length} to index)`;
      },
    },
    {
      title: 'Processing chapters',
      skip: (ctx) => ctx.toIndex.length === 0,
      task: async (ctx, task) => {
        const startTime = Date.now();

        for (let i = 0; i < ctx.toIndex.length; i++) {
          const chapter = ctx.toIndex[i];
          const bar = formatProgressBar(i + 1, ctx.toIndex.length);
          const eta = formatEta(startTime, i + 1, ctx.toIndex.length);

          // Embedding phase
          task.output =
            `${bar} | ETA: ${eta}\n` +
            `${chapter.id} - Generating embedding...\n` +
            `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;

          const vector = await generateEmbedding(chapter.content, ctx.db.embeddingModel);

          // Extraction phase
          task.output =
            `${bar} | ETA: ${eta}\n` +
            `${chapter.id} - Extracting entities...\n` +
            `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;

          const { entities, relations } = await extractEntities(chapter.content);

          // Build and save chapter record
          const chapterRecord: ChapterRecord = {
            ...chapter,
            vector,
            entities: entities.map((e) => `${chapter.arc}:${e.type}:${e.name}`),
            indexed_at: Date.now(),
          };
          await ctx.db.upsertChapters([chapterRecord]);
          ctx.processedCount++;

          // Aggregate entities
          for (const entity of entities) {
            const entityId = `${chapter.arc}:${entity.type}:${entity.name}`;
            const existing = ctx.entities.get(entityId);

            if (existing) {
              existing.chapters.push(chapter.id);
              existing.chapter_count++;
              for (const alias of entity.aliases) {
                if (!existing.aliases.includes(alias)) {
                  existing.aliases.push(alias);
                }
              }
            } else {
              ctx.entities.set(entityId, {
                id: entityId,
                arc: chapter.arc,
                name: entity.name,
                type: entity.type,
                description: entity.description,
                aliases: entity.aliases,
                vector: [],
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
            const existing = ctx.relations.get(relationId);

            if (existing) {
              if (!existing.chapters.includes(chapter.id)) {
                existing.chapters.push(chapter.id);
              }
            } else {
              ctx.relations.set(relationId, {
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

        task.title = `Processing chapters (${ctx.toIndex.length} chapters)`;
        task.output = `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;
      },
    },
    {
      title: 'Generating entity embeddings',
      skip: (ctx) => ctx.entities.size === 0,
      task: async (ctx, task) => {
        const entities = [...ctx.entities.values()];
        const startTime = Date.now();

        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          const bar = formatProgressBar(i + 1, entities.length);
          const eta = formatEta(startTime, i + 1, entities.length);

          task.output = `${bar} | ETA: ${eta}\n${entity.name}`;

          entity.vector = await generateEmbedding(
            `${entity.name}: ${entity.description}`,
            ctx.db.embeddingModel,
          );
        }

        task.title = `Generating entity embeddings (${entities.length} entities)`;
      },
    },
    {
      title: 'Saving to database',
      skip: (ctx) =>
        ctx.entities.size === 0 && ctx.relations.size === 0 && ctx.toDelete.length === 0,
      task: async (ctx, task) => {
        if (ctx.entities.size > 0) {
          await ctx.db.upsertEntities([...ctx.entities.values()]);
        }
        if (ctx.relations.size > 0) {
          await ctx.db.upsertRelations([...ctx.relations.values()]);
        }
        if (ctx.toDelete.length > 0) {
          await ctx.db.deleteChaptersByPaths(ctx.toDelete);
        }

        task.title = `Saving to database (${ctx.entities.size} entities, ${ctx.relations.size} relations)`;
      },
    },
  ];
}

export async function runIndexTasks(
  input: IndexTasksInput,
  silent = false,
): Promise<IndexTasksOutput> {
  // Initialize database before creating tasks
  const db = new Database(input.dbPath, input.force);
  await db.connect();

  const baseCtx: IndexTasksContext = {
    ...input,
    force: input.force ?? false,
    db,
    scanned: [],
    toIndex: [],
    toDelete: [],
    entities: new Map<string, EntityRecord>(),
    relations: new Map<string, RelationRecord>(),
    processedCount: 0,
  };

  const tasks = silent
    ? new Listr<IndexTasksContext, 'silent'>(createTasks(), {
        concurrent: false,
        renderer: 'silent',
        ctx: baseCtx,
      })
    : new Listr<IndexTasksContext, 'default'>(createTasks(), {
        concurrent: false,
        renderer: 'default',
        rendererOptions: {
          collapseSubtasks: false,
          timer: PRESET_TIMER,
        },
        ctx: baseCtx,
      });

  // Handle SIGINT for graceful shutdown
  /* c8 ignore start */
  let cancelled = false;
  const sigintHandler = () => {
    cancelled = true;
  };
  process.on('SIGINT', sigintHandler);
  /* c8 ignore stop */

  try {
    const ctx = await tasks.run();

    return {
      indexed: ctx.toIndex.length,
      skipped: ctx.scanned.length - ctx.toIndex.length,
      deleted: ctx.toDelete.length,
      entities: ctx.entities.size,
      relations: ctx.relations.size,
    };
  } catch (error) {
    /* c8 ignore start */
    if (cancelled) {
      // Return partial results on cancellation
      return {
        indexed: baseCtx.processedCount,
        skipped: baseCtx.scanned.length - baseCtx.toIndex.length,
        deleted: 0,
        entities: baseCtx.entities.size,
        relations: baseCtx.relations.size,
      };
    }
    /* c8 ignore stop */
    throw error;
  } finally {
    process.off('SIGINT', sigintHandler);
    db.close();
  }
}
