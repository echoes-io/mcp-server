import { describe, expect, it } from 'vitest';

import { ragContext } from '../../src/tools/rag-context.js';

describe('rag-context tool', () => {
  it('should retrieve context for AI', async () => {
    const result = await ragContext({
      timeline: 'test-timeline',
      query: 'test query',
      maxChapters: 5,
      allCharacters: false,
    });

    expect(result).toHaveProperty('chapters');
    expect(result).toHaveProperty('totalChapters');
    expect(result).toHaveProperty('searchTime');
    expect(result).toHaveProperty('contextLength');
    expect(Array.isArray(result.chapters)).toBe(true);
    expect(typeof result.totalChapters).toBe('number');
    expect(typeof result.searchTime).toBe('number');
    expect(typeof result.contextLength).toBe('number');
  });

  it('should handle context with filters', async () => {
    const result = await ragContext({
      timeline: 'test-timeline',
      query: 'test query',
      maxChapters: 3,
      characters: ['Alice', 'Bob'],
      allCharacters: true,
      arc: 'arc1',
      pov: 'Alice',
    });

    expect(result.chapters).toBeInstanceOf(Array);
    expect(result.totalChapters).toBeGreaterThanOrEqual(0);
    expect(result.contextLength).toBeGreaterThanOrEqual(0);
  });

  it('should include full content in chapters', async () => {
    const result = await ragContext({
      timeline: 'test-timeline',
      query: 'test query',
      maxChapters: 2,
      allCharacters: false,
    });

    result.chapters.forEach((chapter) => {
      expect(chapter).toHaveProperty('fullContent');
      expect(chapter).toHaveProperty('characters');
      expect(chapter).toHaveProperty('metadata');
      expect(chapter).toHaveProperty('score');
      expect(chapter).toHaveProperty('source');
      expect(typeof chapter.fullContent).toBe('string');
    });
  });

  it('should validate input schema', async () => {
    await expect(
      ragContext({
        timeline: '',
        query: 'test',
        maxChapters: 5,
        allCharacters: false,
      }),
    ).rejects.toThrow();

    await expect(
      ragContext({
        timeline: 'test',
        query: '',
        maxChapters: 5,
        allCharacters: false,
      }),
    ).rejects.toThrow();
  });

  it('should handle empty results gracefully', async () => {
    const result = await ragContext({
      timeline: 'non-existent-timeline',
      query: 'non-existent query',
      maxChapters: 5,
      allCharacters: false,
    });

    expect(result.chapters).toBeInstanceOf(Array);
    expect(result.totalChapters).toBe(0);
    expect(result.contextLength).toBe(0);
    expect(result.searchTime).toBeGreaterThan(0);
  });
});
