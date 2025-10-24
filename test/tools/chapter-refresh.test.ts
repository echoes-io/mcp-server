import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { chapterRefresh, chapterRefreshSchema } from '../../lib/tools/chapter-refresh.js';

describe('chapter-refresh tool', () => {
  it('should refresh chapter from file', async () => {
    // Mock tracker with existing chapter
    const mockTracker = {
      getChapter: vi.fn().mockResolvedValue({
        pov: 'OldPOV',
        title: 'Old Title',
        words: 50,
      }),
      updateChapter: vi.fn().mockResolvedValue(undefined),
    };

    const testFile = join(process.cwd(), 'test/example.md');
    const result = await chapterRefresh({ file: testFile }, mockTracker as any);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info.file).toBe(testFile);
    expect(info.timeline).toBe('test-timeline');
    expect(info.updated.metadata).toBeDefined();
    expect(info.updated.stats).toBeDefined();

    expect(mockTracker.getChapter).toHaveBeenCalledWith('test-timeline', 'test-arc', 1, 1);
    expect(mockTracker.updateChapter).toHaveBeenCalled();
  });

  it('should handle missing chapter in database', async () => {
    const mockTracker = {
      getChapter: vi.fn().mockResolvedValue(null),
      updateChapter: vi.fn(),
    };

    const testFile = join(process.cwd(), 'test/example.md');

    await expect(chapterRefresh({ file: testFile }, mockTracker as any)).rejects.toThrow(
      'Chapter not found in database',
    );

    expect(mockTracker.updateChapter).not.toHaveBeenCalled();
  });

  it('should handle missing metadata', async () => {
    // Mock parseMarkdown to return incomplete metadata
    vi.doMock('@echoes-io/utils', () => ({
      parseMarkdown: vi.fn().mockReturnValue({
        metadata: { timeline: 'test' }, // Missing required fields
        content: 'Test content',
      }),
      getTextStats: vi.fn().mockReturnValue({ words: 10 }),
    }));

    const mockTracker = { getChapter: vi.fn(), updateChapter: vi.fn() };
    const testFile = join(process.cwd(), 'test/example.md');

    const { chapterRefresh: mockedChapterRefresh } = await import(
      '../../lib/tools/chapter-refresh.js'
    );

    await expect(mockedChapterRefresh({ file: testFile }, mockTracker as any)).rejects.toThrow(
      'Failed to refresh chapter',
    );

    vi.clearAllMocks();
  });

  it('should handle file read errors', async () => {
    const mockTracker = { getChapter: vi.fn(), updateChapter: vi.fn() };

    await expect(chapterRefresh({ file: 'nonexistent.md' }, mockTracker as any)).rejects.toThrow(
      'Failed to refresh chapter',
    );
  });

  it('should validate input schema', () => {
    expect(() => chapterRefreshSchema.parse({ file: 'test.md' })).not.toThrow();
    expect(() => chapterRefreshSchema.parse({})).toThrow();
  });
});
