import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { Database } from '../database/index.js';
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

interface ReviewStats {
  arc: string;
  entities: {
    pending: number;
    approved: number;
    rejected: number;
    modified: number;
    total: number;
  };
  relations: {
    pending: number;
    approved: number;
    rejected: number;
    modified: number;
    total: number;
  };
}

function getReviewStatus(item: any): string {
  return item.review_status || 'pending';
}

export async function reviewStatus(input: ReviewStatusInput): Promise<ReviewStats> {
  const { arc, dbPath } = reviewStatusSchema.parse(input);

  const db = new Database(dbPath);
  await db.connect();

  const entities = await db.getEntities(arc);
  const relations = await db.getRelations(arc);

  db.close();

  // Count entity statuses
  const entityStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
    total: entities.length,
  };

  for (const entity of entities) {
    const status = getReviewStatus(entity);
    if (status in entityStats) {
      (entityStats as any)[status]++;
    }
  }

  // Count relation statuses
  const relationStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
    total: relations.length,
  };

  for (const relation of relations) {
    const status = getReviewStatus(relation);
    if (status in relationStats) {
      (relationStats as any)[status]++;
    }
  }

  return {
    arc,
    entities: entityStats,
    relations: relationStats,
  };
}
