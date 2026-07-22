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
              isPaused: false,
              deployment: {
                discoveredAt: '2024-01-01T00:00:00Z',
                submitActionId: 'abc',
                pollActionId: 'def',
              },
              settings: {
                modelId: 'flux',
                architecture: 'schnell',
                resolution: '1024x1024',
                aspectRatio: '1:1',
                fastMode: true,
              },
              auth: {
                hasSession: true,
                hasAuthToken: true,
                sessionExpiresAt: '2024-02-01T00:00:00Z',
              },
            },
          };
        }
        if (variables.status === 'QUEUED') return { listMageJobs: [{ id: 'q1' }, { id: 'q2' }] };
        if (variables.status === 'PROCESSING') return { listMageJobs: [{ id: 'p1' }] };
        // COMPLETE
        return {
          listMageJobs: [
            { id: 'c1', s3Uploaded: true, gitCommitted: true },
            { id: 'c2', s3Uploaded: true, gitCommitted: false },
            { id: 'c3', s3Uploaded: false, gitCommitted: false },
          ],
        };
      }),
    };

    const result = await mageStatus(client);

    expect(result.queue.paused).toBe(false);
    expect(result.queue.queued).toBe(2);
    expect(result.queue.processing).toBe(1);
    expect(result.results.total).toBe(3);
    expect(result.results.unsaved).toBe(1);
    expect(result.results.uncommitted).toBe(1);
    expect(result.deployment?.discoveredAt).toBe('2024-01-01T00:00:00Z');
    expect(result.auth?.hasSession).toBe(true);
  });

  it('handles empty state', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (!variables) {
          return {
            getMageConfig: {
              isPaused: true,
              deployment: null,
              settings: null,
              auth: null,
            },
          };
        }
        return { listMageJobs: [] };
      }),
    };

    const result = await mageStatus(client);
    expect(result.queue.paused).toBe(true);
    expect(result.queue.queued).toBe(0);
    expect(result.queue.processing).toBe(0);
    expect(result.results.total).toBe(0);
    expect(result.deployment).toBeUndefined();
    expect(result.auth).toBeUndefined();
  });
});
