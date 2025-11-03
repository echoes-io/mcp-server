import type { RAGSystem } from '@echoes-io/rag';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ragCharacters } from '../../lib/tools/rag-characters.js';

describe('rag-characters tool', () => {
  beforeEach(() => {});

  afterEach(() => {});

  it('should get character mentions', async () => {
    const mockCharacters = ['Alice', 'Bob', 'Charlie'];

    const mockRag = {
      getCharacterMentions: vi.fn().mockResolvedValue(mockCharacters),
    } as unknown as RAGSystem;

    const result = await ragCharacters({ timeline: 'test-timeline', character: 'Alice' }, mockRag);

    expect(mockRag.getCharacterMentions).toHaveBeenCalledWith('Alice');

    const data = JSON.parse(result.content[0].text);
    expect(data.character).toBe('Alice');
    expect(data.timeline).toBe('test-timeline');
    expect(data.coOccurringCharacters).toEqual(['Bob', 'Charlie']);
    expect(data.total).toBe(2);
  });

  it('should handle no co-occurring characters', async () => {
    const mockRag = {
      getCharacterMentions: vi.fn().mockResolvedValue(['Alice']),
    } as unknown as RAGSystem;

    const result = await ragCharacters({ timeline: 'test-timeline', character: 'Alice' }, mockRag);

    const data = JSON.parse(result.content[0].text);
    expect(data.coOccurringCharacters).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should sort characters alphabetically', async () => {
    const mockRag = {
      getCharacterMentions: vi.fn().mockResolvedValue(['Alice', 'Zoe', 'Bob']),
    } as unknown as RAGSystem;

    const result = await ragCharacters({ timeline: 'test-timeline', character: 'Alice' }, mockRag);

    const data = JSON.parse(result.content[0].text);
    expect(data.coOccurringCharacters).toEqual(['Bob', 'Zoe']);
  });
});
