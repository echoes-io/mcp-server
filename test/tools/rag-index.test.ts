import type { Dirent } from 'node:fs';
import { readdirSync, readFileSync } from 'node:fs';

import type { RAGSystem } from '@echoes-io/rag';
import type { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ragIndex } from '../../lib/tools/rag-index.js';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('rag-index tool', () => {
  beforeEach(() => {
    vi.mocked(readdirSync).mockImplementation(((path: unknown, options?: unknown) => {
      if (typeof path === 'string' && path.includes('arc1')) {
        if (
          typeof options === 'object' &&
          options !== null &&
          'withFileTypes' in options &&
          options.withFileTypes
        ) {
          return [{ isDirectory: () => true, name: 'ep01-episode-title' }] as Dirent[];
        }
        return ['ep01-ch001-alice-title.md'] as string[];
      }
      return [];
    }) as unknown as typeof readdirSync);

    vi.mocked(readFileSync).mockReturnValue('---\npov: Alice\n---\nChapter content');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should index all chapters', async () => {
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'arc1',
        episodeNumber: 1,
        number: 1,
        pov: 'Alice',
        title: 'Ch1',
        content: 'Chapter content',
      },
    ];

    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'arc1' }]),
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const mockRag = {
      addChapters: vi.fn().mockResolvedValue(undefined),
    } as unknown as RAGSystem;

    const result = await ragIndex(
      { timeline: 'test-timeline', contentPath: './test-content' },
      mockTracker,
      mockRag,
    );

    expect(mockRag.addChapters).toHaveBeenCalledWith([
      {
        id: 'test-timeline-arc1-1-1',
        metadata: mockChapters[0],
        content: expect.any(String),
      },
    ]);

    const data = JSON.parse(result.content[0].text);
    expect(data.indexed).toBe(1);
    expect(data.timeline).toBe('test-timeline');
  });

  it('should index specific arc', async () => {
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'arc1',
        episodeNumber: 1,
        number: 1,
        pov: 'Alice',
        content: 'Content',
      },
    ];

    const mockTracker = {
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const mockRag = {
      addChapters: vi.fn().mockResolvedValue(undefined),
    } as unknown as RAGSystem;

    const result = await ragIndex(
      { timeline: 'test-timeline', contentPath: './test-content', arc: 'arc1' },
      mockTracker,
      mockRag,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.arc).toBe('arc1');
  });

  it('should index specific episode', async () => {
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'arc1',
        episodeNumber: 1,
        number: 1,
        pov: 'Alice',
        content: 'Content',
      },
    ];

    const mockTracker = {
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const mockRag = {
      addChapters: vi.fn().mockResolvedValue(undefined),
    } as unknown as RAGSystem;

    const result = await ragIndex(
      { timeline: 'test-timeline', contentPath: './test-content', arc: 'arc1', episode: 1 },
      mockTracker,
      mockRag,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.episode).toBe(1);
  });
});
