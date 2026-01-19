import { describe, expect, it } from 'vitest';

import { arcResume } from '../lib/tools/arc-resume.js';

describe('arc-resume', () => {
  it('should load arc context with episode outline, characters, and recent chapters', () => {
    const result = arcResume({
      arc: 'bloom',
      episode: 1,
      lastChapters: 2,
      contentPath: 'test/fixtures/content',
      docsPath: 'test/fixtures/docs',
    });

    expect(result.arc).toBe('bloom');
    expect(result.episode).toBe(1);
    expect(result.recentChapters.length).toBeGreaterThan(0);
    expect(result.recentChapters[0]).toHaveProperty('file');
    expect(result.recentChapters[0]).toHaveProperty('pov');
    expect(result.recentChapters[0]).toHaveProperty('title');
    expect(result.recentChapters[0]).toHaveProperty('wordCount');
  });

  it('should default to latest episode when episode not specified', () => {
    const result = arcResume({
      arc: 'bloom',
      contentPath: 'test/fixtures/content',
      docsPath: 'test/fixtures/docs',
    });

    expect(result.arc).toBe('bloom');
    expect(result.episode).toBeGreaterThan(0);
  });

  it('should throw error for non-existent arc', () => {
    expect(() =>
      arcResume({
        arc: 'nonexistent',
        contentPath: 'test/fixtures/content',
        docsPath: 'test/fixtures/docs',
      }),
    ).toThrow();
  });
});
