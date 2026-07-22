import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import {
  mageQueueAdd,
  mageQueueAddBulk,
  mageQueueCancel,
  mageQueueList,
  mageQueuePause,
  mageQueueResume,
  parsePromptPrefix,
} from '../../lib/tools/mage-queue.js';

describe('parsePromptPrefix', () => {
  it('extracts number from [XX] prefix', () => {
    const result = parsePromptPrefix('[03] Full body of [ALE] at the café');
    expect(result.number).toBe(3);
    expect(result.variant).toBeUndefined();
    expect(result.cleanPrompt).toBe('Full body of [ALE] at the café');
  });

  it('extracts number and variant from [XXa] prefix', () => {
    const result = parsePromptPrefix('[12b] Close-up shot');
    expect(result.number).toBe(12);
    expect(result.variant).toBe('b');
    expect(result.cleanPrompt).toBe('Close-up shot');
  });

  it('returns original prompt when no prefix', () => {
    const result = parsePromptPrefix('Full body of [ALE] at the café');
    expect(result.number).toBeUndefined();
    expect(result.variant).toBeUndefined();
    expect(result.cleanPrompt).toBe('Full body of [ALE] at the café');
  });
});

describe('mageQueueAdd', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    client = {
      execute: vi.fn().mockResolvedValue({
        queueMageImage: {
          id: 'job-123',
          prompt: 'Full body of [ALE]',
          imageType: 'scene',
          arc: 'ale',
          folder: 'ep01',
          number: 1,
          variant: undefined,
          mediaType: 'image',
          status: 'QUEUED',
          createdAt: '2024-01-01T00:00:00Z',
        },
      }),
    };
  });

  it('queues a job with explicit params', async () => {
    const result = await mageQueueAdd(
      { prompt: 'Full body of [ALE]', imageType: 'scene', arc: 'ale', folder: 'ep01', number: 1 },
      client,
    );

    expect(result.id).toBe('job-123');
    expect(result.status).toBe('QUEUED');
    expect(client.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: 'Full body of [ALE]',
          imageType: 'scene',
          arc: 'ale',
          number: 1,
          folder: 'ep01',
        }),
      }),
    );
  });

  it('extracts number from prompt prefix', async () => {
    await mageQueueAdd(
      { prompt: '[05] Full body of [ALE]', imageType: 'scene', arc: 'ale' },
      client,
    );

    expect(client.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: 'Full body of [ALE]',
          number: 5,
        }),
      }),
    );
  });

  it('uses explicit number over prefix', async () => {
    await mageQueueAdd(
      { prompt: '[05] Full body of [ALE]', imageType: 'scene', arc: 'ale', number: 10 },
      client,
    );

    expect(client.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          number: 10,
        }),
      }),
    );
  });
});

describe('mageQueueAddBulk', () => {
  it('queues multiple jobs from newline-separated prompts', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        queueMageImage: {
          id: 'job-x',
          prompt: 'test',
          imageType: 'scene',
          arc: 'ale',
          number: 1,
          mediaType: 'image',
          status: 'QUEUED',
          createdAt: '2024-01-01T00:00:00Z',
        },
      }),
    };

    const result = await mageQueueAddBulk(
      {
        prompts: '[01] First scene\n[02] Second scene\n\n[03] Third scene',
        imageType: 'scene',
        arc: 'ale',
        folder: 'ep01',
      },
      client,
    );

    expect(result.queued).toBe(3);
    expect(client.execute).toHaveBeenCalledTimes(3);
  });
});

describe('mageQueueList', () => {
  it('returns queued and processing jobs', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockImplementation((_query, variables) => {
        if (variables?.status === 'QUEUED') {
          return { listMageJobs: [{ id: 'q1' }] };
        }
        return { listMageJobs: [{ id: 'p1' }] };
      }),
    };

    const result = await mageQueueList(client);
    expect(result.queued).toHaveLength(1);
    expect(result.processing).toHaveLength(1);
  });
});

describe('mageQueuePause', () => {
  it('pauses the queue and returns true', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({ pauseMageQueue: true }),
    };

    const result = await mageQueuePause(client);
    expect(result).toBe(true);
  });
});

describe('mageQueueResume', () => {
  it('resumes the queue and returns true', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({ resumeMageQueue: true }),
    };

    const result = await mageQueueResume(client);
    expect(result).toBe(true);
  });
});

describe('mageQueueCancel', () => {
  it('cancels a job and returns the job', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        cancelMageJob: { id: 'job-123', status: 'CANCELLED' },
      }),
    };

    const result = await mageQueueCancel({ id: 'job-123' }, client);
    expect(result.id).toBe('job-123');
    expect(result.status).toBe('CANCELLED');
  });
});
