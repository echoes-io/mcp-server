import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { wordsCount, wordsCountSchema } from '../../lib/tools/words-count.js';

describe('words-count tool', () => {
  it('should count words in markdown file', async () => {
    const testFile = join(process.cwd(), 'test/example.md');
    const result = await wordsCount({ file: testFile });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const stats = JSON.parse(result.content[0].text);
    expect(stats.file).toBe(testFile);
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.paragraphs).toBeGreaterThan(0);
  });

  it('should validate input schema', () => {
    expect(() => wordsCountSchema.parse({ file: 'test.md' })).not.toThrow();
    expect(() => wordsCountSchema.parse({})).toThrow();
  });
});
