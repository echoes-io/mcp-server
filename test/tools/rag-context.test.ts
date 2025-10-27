import type { RAGSystem } from '@echoes-io/rag';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ragContext } from '../../lib/tools/rag-context.js';
import { clearTestTimeline, setTestTimeline } from '../helpers.js';

describe('rag-context tool', () => {
  beforeEach(() => {
    setTestTimeline();
  });

  afterEach(() => {
    clearTestTimeline();
  });

  it('should get context for query', async () => {
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
        content: 'Full chapter content for context.',
        similarity: 0.92,
      },
    ];

    const mockRag = {
      getContext: vi.fn().mockResolvedValue(mockResults),
    } as unknown as RAGSystem;

    const result = await ragContext({ query: 'character development' }, mockRag);

    expect(mockRag.getContext).toHaveBeenCalledWith({
      query: 'character development',
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxChapters: undefined,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.query).toBe('character development');
    expect(data.context).toHaveLength(1);
    expect(data.context[0].content).toBe('Full chapter content for context.');
  });

  it('should limit chapters', async () => {
    const mockRag = {
      getContext: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragContext({ query: 'test', maxChapters: 3 }, mockRag);

    expect(mockRag.getContext).toHaveBeenCalledWith({
      query: 'test',
      timeline: 'test-timeline',
      arc: undefined,
      pov: undefined,
      maxChapters: 3,
    });
  });

  it('should filter by pov', async () => {
    const mockRag = {
      getContext: vi.fn().mockResolvedValue([]),
    } as unknown as RAGSystem;

    await ragContext({ query: 'test', pov: 'Alice' }, mockRag);

    expect(mockRag.getContext).toHaveBeenCalledWith({
      query: 'test',
      timeline: 'test-timeline',
      arc: undefined,
      pov: 'Alice',
      maxChapters: undefined,
    });
  });
});
