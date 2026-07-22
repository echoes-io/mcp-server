import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { wordsCount, wordsCountSchema } from '../../lib/tools/words-count.js';

describe('wordsCountSchema', () => {
  it('validates valid input', () => {
    const input = { filePath: './test.md' };
    const result = wordsCountSchema.parse(input);
    expect(result.filePath).toBe('./test.md');
    expect(result.detailed).toBeUndefined();
  });

  it('accepts detailed option', () => {
    const input = { filePath: './test.md', detailed: true };
    const result = wordsCountSchema.parse(input);
    expect(result.detailed).toBe(true);
  });

  it('rejects missing filePath', () => {
    expect(() => wordsCountSchema.parse({})).toThrow();
  });
});

describe('wordsCount', () => {
  const fixturePath = join(
    import.meta.dirname,
    '../fixtures/content/bloom/ep01-first-episode/ep01-ch001-alice-the-beginning.md',
  );

  it('returns basic word count stats', () => {
    const result = wordsCount({ filePath: fixturePath });
    expect(result.words).toBeGreaterThan(50);
    expect(result.characters).toBeGreaterThan(0);
    expect(result.charactersNoSpaces).toBeGreaterThan(0);
    expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    expect(result.sentences).toBeUndefined();
    expect(result.paragraphs).toBeUndefined();
  });

  it('returns detailed stats when requested', () => {
    const result = wordsCount({ filePath: fixturePath, detailed: true });
    expect(result.sentences).toBeGreaterThan(0);
    expect(result.paragraphs).toBeGreaterThan(0);
  });

  it('throws for non-existent file', () => {
    expect(() => wordsCount({ filePath: '/nonexistent/file.md' })).toThrow();
  });
});
