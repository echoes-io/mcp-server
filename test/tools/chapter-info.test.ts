import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it } from 'vitest';

import { chapterInfo, chapterInfoSchema } from '../../lib/tools/chapter-info.js';

describe('chapter-info tool', () => {
  it('should validate input schema', () => {
    expect(() =>
      chapterInfoSchema.parse({
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        chapter: 1,
      }),
    ).not.toThrow();
    expect(() => chapterInfoSchema.parse({})).toThrow();
  });

  it('should handle missing chapter gracefully', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    await expect(
      chapterInfo(
        {
          timeline: 'nonexistent',
          arc: 'nonexistent',
          episode: 1,
          chapter: 1,
        },
        tracker,
      ),
    ).rejects.toThrow('Chapter not found');

    await tracker.close();
  });
});
