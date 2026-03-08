import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
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
  const { contentPath, arc, force, dbPath } = indexSchema.parse(input);

  const arcs = arc
    ? [arc]
    : readdirSync(contentPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

  const totals = { indexed: 0, skipped: 0, deleted: 0, entities: 0, relations: 0 };

  for (const arcName of arcs) {
    const { rag } = createEchoesRAG({ dbPath, arc: arcName, contentPath });

    await rag.index(join(contentPath, arcName), {
      force,
      onProgress: (event) => {
        if (event.type === 'document:done') totals.indexed++;
        if (event.type === 'document:skip') totals.skipped++;
        if (event.type === 'document:delete') totals.deleted++;
      },
    });

    const stats = await rag.stats();
    totals.entities += stats.entities;
    totals.relations += stats.relations;
  }

  return totals;
}
