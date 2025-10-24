import { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { episodeUpdate } from '../../lib/tools/episode-update.js';
import { clearTestTimeline, setTestTimeline } from '../helpers.js';

describe('episode-update', () => {
  let tracker: Tracker;

  beforeEach(async () => {
    setTestTimeline();
    tracker = new Tracker(':memory:');
    await tracker.init();

    await tracker.createTimeline({ name: 'test-timeline', description: 'Test' });
    await tracker.createArc({
      timelineName: 'test-timeline',
      name: 'arc1',
      number: 1,
      description: 'Arc 1',
    });
    await tracker.createEpisode({
      timelineName: 'test-timeline',
      arcName: 'arc1',
      number: 1,
      slug: 'ep01-old',
      title: 'Old Title',
      description: 'Old description',
    });
  });

  afterEach(() => {
    clearTestTimeline();
  });

  it('should update episode description', async () => {
    const result = await episodeUpdate(
      {
        arc: 'arc1',
        episode: 1,
        description: 'New description',
      },
      tracker,
    );

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text);
    expect(data.updated.description).toBe('New description');
  });

  it('should update episode title and slug', async () => {
    const result = await episodeUpdate(
      {
        arc: 'arc1',
        episode: 1,
        title: 'New Title',
        slug: 'ep01-new',
      },
      tracker,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.updated.title).toBe('New Title');
    expect(data.updated.slug).toBe('ep01-new');
  });

  it('should throw error if episode not found', async () => {
    await expect(
      episodeUpdate(
        {
          arc: 'arc1',
          episode: 999,
          description: 'Test',
        },
        tracker,
      ),
    ).rejects.toThrow('Episode not found');
  });
});
