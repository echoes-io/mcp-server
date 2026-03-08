import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import type { ToolConfig } from '../types.js';

export const reviewStatusConfig: ToolConfig = {
  name: 'review-status',
  description: 'Show review statistics for an arc.',
  arguments: {
    arc: 'Arc name to check review status for.',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const reviewStatusSchema = z.object({
  arc: z.string().min(1).describe(reviewStatusConfig.arguments.arc),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(reviewStatusConfig.arguments.dbPath),
});

export type ReviewStatusInput = z.infer<typeof reviewStatusSchema>;

interface StatusCounts {
  [key: string]: number;
  pending: number;
  approved: number;
  rejected: number;
  modified: number;
  total: number;
}

export async function reviewStatus(
  input: ReviewStatusInput,
): Promise<{ arc: string; entities: StatusCounts; relations: StatusCounts }> {
  const { arc, dbPath } = reviewStatusSchema.parse(input);
  const { storage } = createEchoesRAG({ dbPath, arc });

  const entityStats: StatusCounts = { pending: 0, approved: 0, rejected: 0, modified: 0, total: 0 };
  const relationStats: StatusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
    total: 0,
  };

  const entities = await storage.graph.getEntities();
  entityStats.total = entities.length;
  for (const e of entities) {
    const status = (e.fields?.review_status as string) || 'pending';
    if (status in entityStats) entityStats[status]++;
  }

  const seen = new Set<string>();
  for (const e of entities) {
    for (const r of await storage.graph.getRelations(e.id, 'out')) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      relationStats.total++;
      const status = (r.fields?.review_status as string) || 'pending';
      if (status in relationStats) relationStats[status]++;
    }
  }

  return { arc, entities: entityStats, relations: relationStats };
}
