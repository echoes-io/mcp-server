import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import { LIST_MAGE_JOBS, SAVE_MAGE_RESULT } from '../graphql/queries.js';
import type { ListMageJobsResponse, MageJob, SaveMageResultResponse } from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

// --- mage_results_list ---

export const mageResultsListConfig: ToolConfig = {
  name: 'mage_results_list',
  description: 'List generated Mage results.',
  arguments: {
    unsavedOnly: 'If true, only show results not yet saved to S3.',
    limit: 'Max results (default 20).',
  },
};

export const mageResultsListSchema = z.object({
  unsavedOnly: z.boolean().optional().describe(mageResultsListConfig.arguments.unsavedOnly),
  limit: z.number().optional().describe(mageResultsListConfig.arguments.limit),
});

export type MageResultsListInput = z.infer<typeof mageResultsListSchema>;

export interface MageResultsListOutput {
  results: MageJob[];
  total: number;
}

export async function mageResultsList(
  input: MageResultsListInput,
  client: GraphQLClient,
): Promise<MageResultsListOutput> {
  const { unsavedOnly = false, limit = 20 } = mageResultsListSchema.parse(input);

  const response = await client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, {
    status: 'COMPLETE',
    limit,
  });

  let results = response.listMageJobs.items;

  if (unsavedOnly) {
    results = results.filter((job) => !job.s3Uploaded);
  }

  return { results, total: results.length };
}

// --- mage_results_save ---

export const mageResultsSaveConfig: ToolConfig = {
  name: 'mage_results_save',
  description:
    'Save a generated image: download from Mage CDN → upload to S3 with correct filename.',
  arguments: {
    id: 'ID of the job to save (or prefix).',
  },
};

export const mageResultsSaveSchema = z.object({
  id: z.string().describe(mageResultsSaveConfig.arguments.id),
});

export type MageResultsSaveInput = z.infer<typeof mageResultsSaveSchema>;

export interface MageResultsSaveOutput {
  id: string;
  s3Key?: string;
}

export async function mageResultsSave(
  input: MageResultsSaveInput,
  client: GraphQLClient,
): Promise<MageResultsSaveOutput> {
  const { id } = mageResultsSaveSchema.parse(input);
  const result = await client.execute<SaveMageResultResponse>(SAVE_MAGE_RESULT, { id });
  return { id: result.saveMageResult.id, s3Key: result.saveMageResult.s3Key };
}

// --- mage_results_save_all ---

export const mageResultsSaveAllConfig: ToolConfig = {
  name: 'mage_results_save_all',
  description: 'Save all unsaved generated results to S3.',
  arguments: {
    arc: 'If specified, save only results for this arc.',
  },
};

export const mageResultsSaveAllSchema = z.object({
  arc: z.string().optional().describe(mageResultsSaveAllConfig.arguments.arc),
});

export type MageResultsSaveAllInput = z.infer<typeof mageResultsSaveAllSchema>;

export interface MageResultsSaveAllOutput {
  saved: number;
  results: Array<{ id: string; s3Key?: string }>;
}

export async function mageResultsSaveAll(
  input: MageResultsSaveAllInput,
  client: GraphQLClient,
): Promise<MageResultsSaveAllOutput> {
  const { arc } = mageResultsSaveAllSchema.parse(input);

  // List all unsaved complete jobs
  const { results } = await mageResultsList({ unsavedOnly: true }, client);

  const filtered = arc ? results.filter((job) => job.arc === arc) : results;

  const saved: Array<{ id: string; s3Key?: string }> = [];
  for (const job of filtered) {
    const result = await mageResultsSave({ id: job.id }, client);
    saved.push(result);
  }

  return { saved: saved.length, results: saved };
}
