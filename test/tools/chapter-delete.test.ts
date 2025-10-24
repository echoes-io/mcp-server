import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import { chapterDelete, chapterDeleteSchema } from '../../lib/tools/chapter-delete.js';

describe('chapter-delete tool', () => {
  it('should delete existing chapter', async () => {
    // Mock tracker with existing chapter
    const mockChapter = {
      pov: 'Alice',
      title: 'Test Chapter',
      words: 150,
    };

    const mockTracker = {
      getChapter: vi.fn().mockResolvedValue(mockChapter),
      deleteChapter: vi.fn().mockResolvedValue(undefined),
    };

    const result = await chapterDelete(
      {
        timeline: 'test-timeline',
        arc: 'test-arc',
        episode: 1,
        chapter: 1,
      },
      mockTracker as any,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('test-timeline');
    expect(info.arc).toBe('test-arc');
    expect(info.episode).toBe(1);
    expect(info.chapter).toBe(1);
    expect(info.deleted.pov).toBe('Alice');
    expect(info.deleted.title).toBe('Test Chapter');
    expect(info.message).toBe('Chapter successfully deleted from database');

    expect(mockTracker.getChapter).toHaveBeenCalledWith('test-timeline', 'test-arc', 1, 1);
    expect(mockTracker.deleteChapter).toHaveBeenCalledWith('test-timeline', 'test-arc', 1, 1);
  });

  it('should handle non-existent chapter', async () => {
    const mockTracker = {
      getChapter: vi.fn().mockResolvedValue(null),
      deleteChapter: vi.fn(),
    };

    await expect(
      chapterDelete(
        {
          timeline: 'test-timeline',
          arc: 'test-arc',
          episode: 1,
          chapter: 999,
        },
        mockTracker as any,
      ),
    ).rejects.toThrow('Chapter not found: test-timeline/test-arc/ep1/ch999');

    expect(mockTracker.deleteChapter).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const mockTracker = {
      getChapter: vi.fn().mockResolvedValue({ pov: 'Alice', title: 'Test' }),
      deleteChapter: vi.fn().mockRejectedValue(new Error('Database error')),
    };

    await expect(
      chapterDelete(
        {
          timeline: 'test-timeline',
          arc: 'test-arc',
          episode: 1,
          chapter: 1,
        },
        mockTracker as any,
      ),
    ).rejects.toThrow('Failed to delete chapter: Database error');
  });

  it('should validate input schema', () => {
    expect(() =>
      chapterDeleteSchema.parse({
        timeline: 'test',
        arc: 'test',
        episode: 1,
        chapter: 1,
      }),
    ).not.toThrow();

    expect(() => chapterDeleteSchema.parse({})).toThrow();
    expect(() =>
      chapterDeleteSchema.parse({
        timeline: 'test',
        arc: 'test',
        episode: 'invalid',
      }),
    ).toThrow();
  });
});
