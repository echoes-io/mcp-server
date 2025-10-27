import type { RAGSystem } from '@echoes-io/rag';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ragSearch } from '../../lib/tools/rag-search.js';
import { clearTestTimeline, setTestTimeline } from '../helpers.js';

describe('rag-search tool', () => {
  beforeEach(() => {
    setTestTimeline();
  });

  afterEach(() => {
    clearTestTimeline();
  });

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
        },
        content: 'This is the chapter content with relevant information.',
        similarity: 0.95,
      },
    ];

    const mockRag = {
      search: vi.fn().mockResolvedValue(mockResults),
    } as unknown as RAGSystem;

    const result = await ragSearch({ query: 'relevant information' }, mockRag);

    expect(mockRag.search).toHaveBeenCalledWith('relevant information', {
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxResults: undefined,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.query).toBe('relevant information');
    expect(data.results).toHaveLength(1);
    expect(data.results[0].similarity).toBe(0.95);
  });

  it('should filter by arc', async () => {
    const mockRag = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragSearch({ query: 'test', arc: 'arc1' }, mockRag);

    expect(mockRag.search).toHaveBeenCalledWith('test', {
      timeline: 'test-timeline',
      arc: 'arc1',
      pov: undefined,
      maxResults: undefined,
    });
  });

  it('should limit results', async () => {
    const mockRag = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragSearch({ query: 'test', maxResults: 5 }, mockRag);

    expect(mockRag.search).toHaveBeenCalledWith('test', {
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxResults: 5,
    });
  });
});
