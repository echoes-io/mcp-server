import { describe, expect, it } from 'vitest';

import { ragSearch } from '../../src/tools/rag-search.js';

describe('rag-search tool', () => {
  it('should perform basic search', async () => {
    const result = await ragSearch({
      timeline: 'test-timeline',
      query: 'test query',
      topK: 10,
      allCharacters: false,
      useGraphRAG: true,
    });

    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('totalResults');
    expect(result).toHaveProperty('searchTime');
    expect(result).toHaveProperty('source');
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.totalResults).toBe('number');
    expect(typeof result.searchTime).toBe('number');
  });

  it('should handle search with filters', async () => {
    const result = await ragSearch({
      timeline: 'test-timeline',
      query: 'test query',
      topK: 5,
      characters: ['Alice', 'Bob'],
      allCharacters: true,
      arc: 'arc1',
      pov: 'Alice',
      useGraphRAG: true,
    });

    expect(result.results).toBeInstanceOf(Array);
    expect(result.totalResults).toBeGreaterThanOrEqual(0);
  });

  it('should handle vector-only search', async () => {
    const result = await ragSearch({
      timeline: 'test-timeline',
      query: 'test query',
      topK: 10,
      allCharacters: false,
      useGraphRAG: false,
    });

    expect(result.results).toBeInstanceOf(Array);
    expect(result.source).toMatch(/vector|hybrid/);
  });

  it('should validate input schema', async () => {
    // Test missing timeline
    await expect(
      ragSearch({
        timeline: '',
        query: 'test',
        topK: 10,
        allCharacters: false,
        useGraphRAG: true,
      }),
    ).rejects.toThrow();

    // Test missing query
    await expect(
      ragSearch({
        timeline: 'test',
        query: '',
        topK: 10,
        allCharacters: false,
        useGraphRAG: true,
      }),
    ).rejects.toThrow();
  });

  it('should handle empty results gracefully', async () => {
    const result = await ragSearch({
      timeline: 'non-existent-timeline',
      query: 'non-existent query',
      topK: 10,
      allCharacters: false,
      useGraphRAG: true,
    });

    expect(result.results).toBeInstanceOf(Array);
    expect(result.totalResults).toBe(0);
    expect(result.searchTime).toBeGreaterThan(0);
  });
});
