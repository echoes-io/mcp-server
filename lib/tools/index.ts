import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { type IndexTasksOutput, runIndexTasks } from '../indexer/tasks.js';
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
export type IndexOutput = IndexTasksOutput;

export async function index(input: IndexInput): Promise<IndexOutput> {
  const parsed = indexSchema.parse(input);

  // Use silent renderer for MCP (no stdout output)
  return runIndexTasks(parsed, true);
}
