import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import { GET_MAGE_CONFIG, LIST_MAGE_JOBS } from '../graphql/queries.js';
import type { GetMageConfigResponse, ListMageJobsResponse, MageConfig } from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

export const mageStatusConfig: ToolConfig = {
  name: 'mage_status',
  description: 'Get overall Mage system status: queue, results, deployment, auth.',
  arguments: {},
};

export const mageStatusSchema = z.object({});

export interface MageStatusOutput {
  queue: {
    paused: boolean;
    queued: number;
    processing: number;
  };
  results: {
    total: number;
    unsaved: number;
    uncommitted: number;
  };
  deployment?: {
    discoveredAt?: string;
    submitActionId?: string;
    pollActionId?: string;
  };
  auth?: {
    hasSession: boolean;
    hasAuthToken: boolean;
    sessionExpiresAt?: string;
    authTokenExpiresAt?: string;
  };
}

export async function mageStatus(client: GraphQLClient): Promise<MageStatusOutput> {
  const [configResponse, queuedResponse, processingResponse, completeResponse] = await Promise.all([
    client.execute<GetMageConfigResponse>(GET_MAGE_CONFIG),
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'QUEUED' }),
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'PROCESSING' }),
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'COMPLETE' }),
  ]);

  const config: MageConfig = configResponse.getMageConfig;
  const completeJobs = completeResponse.listMageJobs.items;

  const unsaved = completeJobs.filter((job) => !job.s3Uploaded).length;
  const uncommitted = completeJobs.filter((job) => job.s3Uploaded && !job.gitCommitted).length;

  return {
    queue: {
      paused: config.isPaused,
      queued: queuedResponse.listMageJobs.items.length,
      processing: processingResponse.listMageJobs.items.length,
    },
    results: {
      total: completeJobs.length,
      unsaved,
      uncommitted,
    },
    deployment: config.deployment
      ? {
          discoveredAt: config.deployment.discoveredAt,
          submitActionId: config.deployment.submitActionId,
          pollActionId: config.deployment.pollActionId,
        }
      : undefined,
    auth: config.auth
      ? {
          hasSession: config.auth.hasSession,
          hasAuthToken: config.auth.hasAuthToken,
          sessionExpiresAt: config.auth.sessionExpiresAt,
          authTokenExpiresAt: config.auth.authTokenExpiresAt,
        }
      : undefined,
  };
}
