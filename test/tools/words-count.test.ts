import { unlinkSync, writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { wordsCount } from '../../src/tools/words-count.js';

describe('words-count tool', () => {
  const testFile = '/tmp/test-words-count.md';
  const testContent = `---
title: Test Chapter
pov: Alice
---

# Test Chapter

This is a test chapter with some content. It has multiple sentences and paragraphs.

This is the second paragraph. It contains more words to test the word counting functionality.

The third paragraph is here too. We want to make sure our statistics are accurate.`;

  beforeEach(() => {
    writeFileSync(testFile, testContent);
  });

  afterEach(() => {
    try {
      unlinkSync(testFile);
    } catch {
      // File might not exist
    }
  });

  it('should count words correctly', async () => {
    const result = await wordsCount({ filePath: testFile });

    expect(result.words).toBe(47);
    expect(result.characters).toBe(278);
    expect(result.charactersNoSpaces).toBe(229);
    expect(result.readingTimeMinutes).toBe(1);
  });

  it('should include detailed stats when requested', async () => {
    const result = await wordsCount({ filePath: testFile, detailed: true });

    expect(result.words).toBe(47);
    expect(result.sentences).toBe(6);
    expect(result.paragraphs).toBe(4);
  });

  it('should throw error for non-existent file', async () => {
    await expect(wordsCount({ filePath: '/non/existent/file.md' })).rejects.toThrow();
  });
});
