import type { RAGSystem } from '@echoes-io/rag';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ragSearch } from '../../lib/tools/rag-search.js';

describe('rag-search tool', () => {
  beforeEach(() => {});

  afterEach(() => {});

  it('should search with query', async () => {
    const mockResults = [
      {
        id: 'test-1',
        metadata: {
          arcName: 'arc1',
          episodeNumber: 1,
          number: 1,
          pov: 'Alice',
          title: 'Chapter 1',
          characterNames: ['Alice', 'Bob'],
        },
        content: 'This is the chapter content with relevant information.',
        similarity: 0.95,
      },
    ];

    const mockRag = {
      search: vi.fn().mockResolvedValue(mockResults),
    } as unknown as RAGSystem;

    const result = await ragSearch(
      { timeline: 'test-timeline', query: 'relevant information' },
      mockRag,
    );

    expect(mockRag.search).toHaveBeenCalledWith('relevant information', {
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxResults: undefined,
      characters: undefined,
      allCharacters: undefined,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.query).toBe('relevant information');
    expect(data.results).toHaveLength(1);
    expect(data.results[0].similarity).toBe(0.95);
    expect(data.results[0].chapter.characters).toEqual(['Alice', 'Bob']);
  });

  it('should filter by arc', async () => {
    const mockRag = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragSearch({ timeline: 'test-timeline', query: 'test', arc: 'arc1' }, mockRag);

    expect(mockRag.search).toHaveBeenCalledWith('test', {
      timeline: 'test-timeline',
      arc: 'arc1',
      pov: undefined,
      maxResults: undefined,
      characters: undefined,
      allCharacters: undefined,
    });
  });

  it('should limit results', async () => {
    const mockRag = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragSearch({ timeline: 'test-timeline', query: 'test', maxResults: 5 }, mockRag);

    expect(mockRag.search).toHaveBeenCalledWith('test', {
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxResults: 5,
      characters: undefined,
      allCharacters: undefined,
    });
  });

  it('should filter by characters', async () => {
    const mockRag = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragSearch(
      {
        timeline: 'test-timeline',
        query: 'test',
        characters: ['Alice', 'Bob'],
        allCharacters: true,
      },
      mockRag,
    );

    expect(mockRag.search).toHaveBeenCalledWith('test', {
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxResults: undefined,
      characters: ['Alice', 'Bob'],
      allCharacters: true,
    });
  });
});
