import { describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import { mageStatus } from '../../lib/tools/mage-status.js';

describe('mageStatus', () => {
  it('returns aggregated status', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (!variables) {
          // getMageConfig
          return {
            getMageConfig: {
              queuePaused: false,
              queueSize: 5,
              currentJob: { id: 'j1', prompt: 'test prompt', arc: 'ale', status: 'PROCESSING' },
              circuitBreaker: { open: false, failures: 0 },
              deployment: { lastDiscover: '2024-01-01T00:00:00Z' },
            },
          };
        }
        // listMageJobs COMPLETE
        return {
          listMageJobs: {
            items: [
              { id: 'c1', s3Uploaded: true, gitCommitted: true },
              { id: 'c2', s3Uploaded: true, gitCommitted: false },
              { id: 'c3', s3Uploaded: false, gitCommitted: false },
            ],
          },
        };
      }),
    };

    const result = await mageStatus(client);

    expect(result.queue.paused).toBe(false);
    expect(result.queue.size).toBe(5);
    expect(result.queue.currentJob?.id).toBe('j1');
    expect(result.results.total).toBe(3);
    expect(result.results.unsaved).toBe(1);
    expect(result.results.uncommitted).toBe(1);
    expect(result.circuitBreaker.open).toBe(false);
  });

  it('handles no current job', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (!variables) {
          return {
            getMageConfig: {
              queuePaused: true,
              queueSize: 0,
              currentJob: null,
              circuitBreaker: { open: false, failures: 0 },
              deployment: {},
            },
          };
        }
        return { listMageJobs: { items: [] } };
      }),
    };

    const result = await mageStatus(client);
    expect(result.queue.currentJob).toBeUndefined();
    expect(result.queue.paused).toBe(true);
  });
});
