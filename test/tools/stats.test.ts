import type { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stats } from '../../lib/tools/stats.js';

describe('stats tool', () => {
  beforeEach(() => {});

  afterEach(() => {});

  it('should get overall timeline stats', async () => {
    const mockChapters = [
      {
        timeline: 'test-timeline',
        pov: 'Alice',
        words: 1000,
        title: 'Ch1',
        arcName: 'arc1',
        episodeNumber: 1,
      },
      {
        timeline: 'test-timeline',
        pov: 'Bob',
        words: 1500,
        title: 'Ch2',
        arcName: 'arc1',
        episodeNumber: 1,
      },
    ];

    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'arc1' }]),
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const result = await stats({ timeline: 'test-timeline' }, mockTracker);

    const data = JSON.parse(result.content[0].text);
    expect(data.timeline).toBe('test-timeline');
    expect(data.summary.totalChapters).toBe(2);
    expect(data.summary.totalWords).toBe(2500);
    expect(data.summary.averageChapterLength).toBe(1250);
    expect(data.povDistribution).toHaveLength(2);
  });

  it('should filter by arc', async () => {
    const mockChapters = [
      {
        timeline: 'test-timeline',
        pov: 'Alice',
        words: 1000,
        title: 'Ch1',
        arcName: 'arc1',
        episodeNumber: 1,
      },
    ];

    const mockTracker = {
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const result = await stats({ timeline: 'test-timeline', arc: 'arc1' }, mockTracker);

    const data = JSON.parse(result.content[0].text);
    expect(data.filters.arc).toBe('arc1');
    expect(data.summary.totalChapters).toBe(1);
  });

  it('should filter by episode', async () => {
    const mockChapters = [
      {
        timeline: 'test-timeline',
        pov: 'Alice',
        words: 1000,
        title: 'Ch1',
        arcName: 'arc1',
        episodeNumber: 1,
      },
    ];

    const mockTracker = {
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const result = await stats({ timeline: 'test-timeline', arc: 'arc1', episode: 1 }, mockTracker);

    const data = JSON.parse(result.content[0].text);
    expect(data.filters.episode).toBe(1);
    expect(data.summary.totalChapters).toBe(1);
  });

  it('should filter by POV', async () => {
    const mockChapters = [
      {
        timeline: 'test-timeline',
        pov: 'Alice',
        words: 1000,
        title: 'Ch1',
        arcName: 'arc1',
        episodeNumber: 1,
      },
      {
        timeline: 'test-timeline',
        pov: 'Bob',
        words: 1500,
        title: 'Ch2',
        arcName: 'arc1',
        episodeNumber: 1,
      },
    ];

    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'arc1' }]),
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const result = await stats({ timeline: 'test-timeline', pov: 'Alice' }, mockTracker);

    const data = JSON.parse(result.content[0].text);
    expect(data.filters.pov).toBe('Alice');
    expect(data.summary.totalChapters).toBe(1);
    expect(data.summary.totalWords).toBe(1000);
  });

  it('should show extremes', async () => {
    const mockChapters = [
      {
        timeline: 'test-timeline',
        pov: 'Alice',
        words: 1000,
        title: 'Short',
        arcName: 'arc1',
        episodeNumber: 1,
      },
      {
        timeline: 'test-timeline',
        pov: 'Bob',
        words: 1500,
        title: 'Long',
        arcName: 'arc1',
        episodeNumber: 1,
      },
    ];

    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'arc1' }]),
      getEpisodes: vi.fn().mockResolvedValue([{ number: 1 }]),
      getChapters: vi.fn().mockResolvedValue(mockChapters),
    } as unknown as Tracker;

    const result = await stats({ timeline: 'test-timeline' }, mockTracker);

    const data = JSON.parse(result.content[0].text);
    expect(data.extremes.longest.words).toBe(1500);
    expect(data.extremes.shortest.words).toBe(1000);
  });
});
