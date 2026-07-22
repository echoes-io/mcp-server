import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import { GET_MAGE_CONFIG, LIST_MAGE_JOBS } from '../graphql/queries.js';
import type { GetMageConfigResponse, ListMageJobsResponse } from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

export const mageStatusConfig: ToolConfig = {
  name: 'mage_status',
  description: 'Get overall Mage system status: queue, results, deployment, circuit breaker.',
  arguments: {},
};

export const mageStatusSchema = z.object({});

export interface MageStatusOutput {
  queue: {
    paused: boolean;
    size: number;
    currentJob?: {
      id: string;
      prompt: string;
      arc: string;
    };
  };
  results: {
    total: number;
    unsaved: number;
    uncommitted: number;
  };
  circuitBreaker: {
    open: boolean;
    failures: number;
    lastFailure?: string;
  };
  deployment: {
    lastDiscover?: string;
  };
}

export async function mageStatus(client: GraphQLClient): Promise<MageStatusOutput> {
  const [configResponse, completeResponse] = await Promise.all([
    client.execute<GetMageConfigResponse>(GET_MAGE_CONFIG),
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'COMPLETE' }),
  ]);

  const config = configResponse.getMageConfig;
  const completeJobs = completeResponse.listMageJobs.items;

  const unsaved = completeJobs.filter((job) => !job.s3Uploaded).length;
  const uncommitted = completeJobs.filter((job) => job.s3Uploaded && !job.gitCommitted).length;

  return {
    queue: {
      paused: config.queuePaused,
      size: config.queueSize,
      currentJob: config.currentJob
        ? {
            id: config.currentJob.id,
            prompt: config.currentJob.prompt,
            arc: config.currentJob.arc,
          }
        : undefined,
    },
    results: {
      total: completeJobs.length,
      unsaved,
      uncommitted,
    },
    circuitBreaker: config.circuitBreaker,
    deployment: config.deployment,
  };
}
