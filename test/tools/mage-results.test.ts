import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import {
  mageResultsList,
  mageResultsSave,
  mageResultsSaveAll,
} from '../../lib/tools/mage-results.js';

describe('mageResultsList', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    client = {
      execute: vi.fn().mockResolvedValue({
        listMageJobs: {
          items: [
            { id: 'j1', s3Uploaded: true, arc: 'ale' },
            { id: 'j2', s3Uploaded: false, arc: 'ale' },
            { id: 'j3', s3Uploaded: false, arc: 'vale' },
          ],
        },
      }),
    };
  });

  it('returns all complete results', async () => {
    const result = await mageResultsList({}, client);
    expect(result.total).toBe(3);
    expect(result.results).toHaveLength(3);
  });

  it('filters to unsaved only', async () => {
    const result = await mageResultsList({ unsavedOnly: true }, client);
    expect(result.total).toBe(2);
    expect(result.results.every((r) => !r.s3Uploaded)).toBe(true);
  });
});

describe('mageResultsSave', () => {
  it('saves a result and returns s3Key', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        saveMageResult: { id: 'j1', s3Key: 'images/ale/ep01/scene-01a.png', s3Uploaded: true },
      }),
    };

    const result = await mageResultsSave({ id: 'j1' }, client);
    expect(result.id).toBe('j1');
    expect(result.s3Key).toBe('images/ale/ep01/scene-01a.png');
  });
});

describe('mageResultsSaveAll', () => {
  it('saves all unsaved results', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (variables?.status === 'COMPLETE') {
          return {
            listMageJobs: {
              items: [
                { id: 'j1', s3Uploaded: false, arc: 'ale' },
                { id: 'j2', s3Uploaded: false, arc: 'ale' },
              ],
            },
          };
        }
        // saveMageResult calls
        return {
          saveMageResult: {
            id: variables?.id ?? 'unknown',
            s3Key: `images/${variables?.id}.png`,
            s3Uploaded: true,
          },
        };
      }),
    };

    const result = await mageResultsSaveAll({}, client);
    expect(result.saved).toBe(2);
  });

  it('filters by arc', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (variables?.status === 'COMPLETE') {
          return {
            listMageJobs: {
              items: [
                { id: 'j1', s3Uploaded: false, arc: 'ale' },
                { id: 'j2', s3Uploaded: false, arc: 'vale' },
              ],
            },
          };
        }
        return {
          saveMageResult: {
            id: variables?.id ?? 'unknown',
            s3Key: `images/${variables?.id}.png`,
            s3Uploaded: true,
          },
        };
      }),
    };

    const result = await mageResultsSaveAll({ arc: 'ale' }, client);
    expect(result.saved).toBe(1);
  });
});
