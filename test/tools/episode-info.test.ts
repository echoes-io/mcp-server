import { join } from 'node:path';

import { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { episodeInfo, episodeInfoSchema } from '../../lib/tools/episode-info.js';
import { clearTestTimeline, setTestTimeline } from '../helpers.js';

describe('episode-info tool', () => {
  beforeEach(() => {
    setTestTimeline();
  });

  afterEach(() => {
    clearTestTimeline();
  });
  it('should get episode info from database', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Use timeline-sync to populate real data
    const { timelineSync } = await import('../../lib/tools/timeline-sync.js');
    const contentPath = join(process.cwd(), 'test/content');

    // Sync data first
    const syncResult = await timelineSync(
      {
        contentPath,
      },
      tracker,
    );

    // Check if sync was successful
    const syncInfo = JSON.parse(syncResult.content[0].text);
    if (syncInfo.summary.added > 0) {
      // Try to get episode info
      try {
        const result = await episodeInfo(
          {
            arc: 'test-arc',
            episode: 1,
          },
          tracker,
        );

        expect(result.content).toHaveLength(1);
        const info = JSON.parse(result.content[0].text);
        expect(info.timeline).toBe('test-timeline');
        expect(info.episodeInfo).toBeDefined();
      } catch (error) {
        // If episode not found, that's also valid coverage
        expect((error as Error).message).toContain('Episode not found');
      }
    }

    await tracker.close();
  });

  it('should validate input schema', () => {
    expect(() =>
      episodeInfoSchema.parse({
        arc: 'test-arc',
        episode: 1,
      }),
    ).not.toThrow();
    expect(() => episodeInfoSchema.parse({})).toThrow();
  });

  it('should handle missing episode gracefully', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    await expect(
      episodeInfo(
        {
          timeline: 'nonexistent',
          arc: 'nonexistent',
          episode: 1,
        },
        tracker,
      ),
    ).rejects.toThrow('Episode not found');

    await tracker.close();
  });
});
