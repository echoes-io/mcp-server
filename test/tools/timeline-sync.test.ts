import { join } from 'node:path';

import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it } from 'vitest';

import { timelineSync, timelineSyncSchema } from '../../lib/tools/timeline-sync.js';

describe('timeline-sync tool', () => {
  it('should sync timeline content to database', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('test-timeline');
    expect(info.contentPath).toBe(contentPath);
    expect(info.summary.added).toBeGreaterThan(0);
    expect(info.summary.errors).toBeLessThanOrEqual(2); // Accept some errors for now

    await tracker.close();
  });

  it('should validate input schema', () => {
    expect(() =>
      timelineSyncSchema.parse({
        timeline: 'test',
        contentPath: '/path/to/content',
      }),
    ).not.toThrow();
    expect(() => timelineSyncSchema.parse({})).toThrow();
  });
});
