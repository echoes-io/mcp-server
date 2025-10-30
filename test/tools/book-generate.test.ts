import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bookGenerate } from '../../lib/tools/book-generate.js';

// Mock the books-generator module
vi.mock('@echoes-io/books-generator', () => ({
  generateBook: vi.fn().mockResolvedValue(undefined),
}));

describe('book-generate tool', () => {
  beforeEach(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate book with default format', async () => {
    const { generateBook } = await import('@echoes-io/books-generator');

    const result = await bookGenerate({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
    });

    expect(generateBook).toHaveBeenCalledWith({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
      episodes: undefined,
      format: 'a4',
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.timeline).toBe('test-timeline');
    expect(data.format).toBe('a4');
  });

  it('should generate book with specific episodes', async () => {
    const { generateBook } = await import('@echoes-io/books-generator');

    const result = await bookGenerate({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
      episodes: '1,2,3',
    });

    expect(generateBook).toHaveBeenCalledWith({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
      episodes: '1,2,3',
      format: 'a4',
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.episodes).toBe('1,2,3');
  });

  it('should generate book with A5 format', async () => {
    const { generateBook } = await import('@echoes-io/books-generator');

    const result = await bookGenerate({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
      format: 'a5',
    });

    expect(generateBook).toHaveBeenCalledWith({
      timeline: 'test-timeline',
      contentPath: './content',
      outputPath: './output/book.pdf',
      episodes: undefined,
      format: 'a5',
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.format).toBe('a5');
  });

  it('should handle generation errors', async () => {
    const { generateBook } = await import('@echoes-io/books-generator');
    vi.mocked(generateBook).mockRejectedValueOnce(new Error('LaTeX compilation failed'));

    await expect(
      bookGenerate({
        timeline: 'test-timeline',
        contentPath: './content',
        outputPath: './output/book.pdf',
      }),
    ).rejects.toThrow('Failed to generate book: LaTeX compilation failed');
  });
});
