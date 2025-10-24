import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it } from 'vitest';

import { episodeInfo, episodeInfoSchema } from '../../lib/tools/episode-info.js';

describe('episode-info tool', () => {
  it('should validate input schema', () => {
    expect(() =>
      episodeInfoSchema.parse({
        timeline: 'test-timeline',
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
