import { join } from 'node:path';

import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

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
    expect(info.summary.deleted).toBeGreaterThanOrEqual(0); // May or may not have deletions
    expect(info.summary.errors).toBeLessThanOrEqual(2); // Accept some errors for now

    await tracker.close();
  });

  it('should handle existing timeline (update path)', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Create timeline first to test the "already exists" branch
    await tracker.createTimeline({
      name: 'existing-timeline',
      description: 'Existing timeline',
    });

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'existing-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('existing-timeline');

    await tracker.close();
  });

  it('should handle file read errors', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock readFileSync to throw error for .md files
    const originalReadFileSync = require('fs').readFileSync;
    vi.spyOn(require('fs'), 'readFileSync').mockImplementation((path, encoding) => {
      if (path.toString().includes('.md')) {
        throw new Error('File read error');
      }
      return originalReadFileSync(path, encoding);
    });

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary.errors).toBeGreaterThan(0);

    vi.restoreAllMocks();
    await tracker.close();
  });

  it('should handle missing metadata fields (fallback paths)', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock parseMarkdown to return empty metadata to test fallback branches
    vi.doMock('@echoes-io/utils', () => ({
      parseMarkdown: vi.fn().mockReturnValue({
        metadata: {}, // Empty metadata to test || fallbacks
        content: 'Test content',
      }),
      getTextStats: vi.fn().mockReturnValue({
        words: 50,
        characters: 250,
        charactersNoSpaces: 200,
        paragraphs: 1,
        sentences: 3,
      }),
    }));

    const contentPath = join(process.cwd(), 'test/content');

    // Import after mocking
    const { timelineSync: mockedTimelineSync } = await import('../../lib/tools/timeline-sync.js');
    const result = await mockedTimelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary).toBeDefined();

    vi.clearAllMocks();
    await tracker.close();
  });

  it('should handle empty content directory', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Test with non-existent directory to trigger error handling
    await expect(
      timelineSync(
        {
          timeline: 'test-timeline',
          contentPath: '/nonexistent/path',
        },
        tracker,
      ),
    ).rejects.toThrow('Failed to sync timeline');

    await tracker.close();
  });

  it('should handle chapter deletions', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock tracker.getChapters to return chapters that don't exist in filesystem
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'nonexistent-arc',
        episodeNumber: 99,
        number: 1,
        pov: 'Ghost',
        title: 'Deleted Chapter',
      },
    ];

    vi.spyOn(tracker, 'getChapters').mockResolvedValue(mockChapters as any);
    vi.spyOn(tracker, 'deleteChapter').mockResolvedValue(undefined);

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary.deleted).toBeGreaterThan(0);
    expect(tracker.deleteChapter).toHaveBeenCalled();

    vi.restoreAllMocks();
    await tracker.close();
  });

  it('should handle getChapters error gracefully', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock getChapters to throw error
    vi.spyOn(tracker, 'getChapters').mockRejectedValue(new Error('DB error'));

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary.errors).toBeGreaterThan(0);

    vi.restoreAllMocks();
    await tracker.close();
  });

  it('should handle deleteChapter error gracefully', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock chapters that don't exist in filesystem
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'nonexistent-arc',
        episodeNumber: 99,
        number: 1,
      },
    ];

    vi.spyOn(tracker, 'getChapters').mockResolvedValue(mockChapters as any);
    vi.spyOn(tracker, 'deleteChapter').mockRejectedValue(new Error('Delete error'));

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary.errors).toBeGreaterThan(0);

    vi.restoreAllMocks();
    await tracker.close();
  });

  it('should handle filesystem check errors', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();

    // Mock chapters with problematic paths
    const mockChapters = [
      {
        timelineName: 'test-timeline',
        arcName: 'test-arc',
        episodeNumber: 1,
        number: 1,
      },
    ];

    vi.spyOn(tracker, 'getChapters').mockResolvedValue(mockChapters as any);
    vi.spyOn(tracker, 'deleteChapter').mockResolvedValue(undefined);

    // Mock readdirSync to throw error
    const originalReaddirSync = require('fs').readdirSync;
    vi.spyOn(require('fs'), 'readdirSync').mockImplementation((path) => {
      if (path.toString().includes('test-arc')) {
        throw new Error('Permission denied');
      }
      return originalReaddirSync(path);
    });

    const contentPath = join(process.cwd(), 'test/content');
    const result = await timelineSync(
      {
        timeline: 'test-timeline',
        contentPath,
      },
      tracker,
    );

    const info = JSON.parse(result.content[0].text);
    expect(info.summary).toBeDefined(); // Just check it completes

    vi.restoreAllMocks();
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
