import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { wordsCount, wordsCountSchema } from '../../lib/tools/words-count.js';

describe('wordsCountSchema', () => {
  it('validates valid input', () => {
    const input = { filePath: '/path/to/file.md', detailed: true };
    const result = wordsCountSchema.parse(input);

    expect(result.filePath).toBe('/path/to/file.md');
    expect(result.detailed).toBe(true);
  });

  it('defaults detailed to undefined', () => {
    const input = { filePath: '/path/to/file.md' };
    const result = wordsCountSchema.parse(input);

    expect(result.detailed).toBeUndefined();
  });

  it('rejects missing filePath', () => {
    expect(() => wordsCountSchema.parse({})).toThrow();
  });
});

describe('wordsCount', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('counts words in plain text', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'One two three four five.');

    const result = wordsCount({ filePath });

    expect(result.words).toBe(5);
  });

  it('counts characters', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'Hello world.');

    const result = wordsCount({ filePath });

    expect(result.characters).toBe(12);
    expect(result.charactersNoSpaces).toBe(11);
  });

  it('calculates reading time', () => {
    const filePath = join(tempDir, 'test.md');
    // 200 words = 1 minute
    const words = Array(200).fill('word').join(' ');
    writeFileSync(filePath, words);

    const result = wordsCount({ filePath });

    expect(result.readingTimeMinutes).toBe(1);
  });

  it('rounds reading time up', () => {
    const filePath = join(tempDir, 'test.md');
    // 201 words = 2 minutes (rounded up)
    const words = Array(201).fill('word').join(' ');
    writeFileSync(filePath, words);

    const result = wordsCount({ filePath });

    expect(result.readingTimeMinutes).toBe(2);
  });

  it('excludes frontmatter from count', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(
      filePath,
      `---
pov: Alice
title: Test
---

One two three.`,
    );

    const result = wordsCount({ filePath });

    expect(result.words).toBe(3);
  });

  it('includes sentences and paragraphs when detailed', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(
      filePath,
      `First sentence. Second sentence!

Third sentence in new paragraph?`,
    );

    const result = wordsCount({ filePath, detailed: true });

    expect(result.sentences).toBe(3);
    expect(result.paragraphs).toBe(2);
  });

  it('omits sentences and paragraphs when not detailed', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'Some text.');

    const result = wordsCount({ filePath, detailed: false });

    expect(result.sentences).toBeUndefined();
    expect(result.paragraphs).toBeUndefined();
  });

  it('strips markdown headers from count', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(
      filePath,
      `# Header One

Some content here.

## Header Two

More content.`,
    );

    const result = wordsCount({ filePath });

    // Should only count "Some content here. More content." = 5 words
    expect(result.words).toBe(5);
  });

  it('strips markdown formatting from count', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'This is **bold** and *italic* text.');

    const result = wordsCount({ filePath });

    // Should count "This is bold and italic text." = 6 words
    expect(result.words).toBe(6);
  });

  it('strips markdown links from count', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'Click [here](https://example.com) for more.');

    const result = wordsCount({ filePath });

    // Should count "Click here for more." = 4 words
    expect(result.words).toBe(4);
  });

  it('strips markdown images from count', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'See image ![alt text](image.png) below.');

    const result = wordsCount({ filePath });

    // remove-markdown keeps alt text, so "See image alt text below." = 5 words
    expect(result.words).toBe(5);
  });

  it('handles empty file', () => {
    const filePath = join(tempDir, 'empty.md');
    writeFileSync(filePath, '');

    const result = wordsCount({ filePath });

    expect(result.words).toBe(0);
    expect(result.characters).toBe(0);
  });

  it('throws on non-existent file', () => {
    expect(() => wordsCount({ filePath: '/nonexistent/file.md' })).toThrow();
  });
});
