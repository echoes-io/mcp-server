import { describe, expect, it } from 'vitest';

import { arcResume } from '../lib/tools/arc-resume.js';

describe('arc-resume', () => {
  it('should load arc context with episode outline, characters, and recent chapters', () => {
    const result = arcResume({
      arc: 'cri',
      episode: 1,
      lastChapters: 3,
      contentPath: '../timeline-eros/content',
      docsPath: '../timeline-eros/docs',
    });

    expect(result.arc).toBe('cri');
    expect(result.episode).toBe(1);
    expect(result.episodeOutline).toContain('Ricontatto');
    expect(result.characters).toHaveProperty('cri');
    expect(result.characters).toHaveProperty('nic-behavior');
    expect(result.recentChapters).toHaveLength(3);
    expect(result.recentChapters[0]).toHaveProperty('file');
    expect(result.recentChapters[0]).toHaveProperty('pov');
    expect(result.recentChapters[0]).toHaveProperty('title');
    expect(result.recentChapters[0]).toHaveProperty('wordCount');
  });

  it('should default to latest episode when episode not specified', () => {
    const result = arcResume({
      arc: 'cri',
      contentPath: '../timeline-eros/content',
      docsPath: '../timeline-eros/docs',
    });

    expect(result.arc).toBe('cri');
    expect(result.episode).toBeGreaterThan(0);
  });

  it('should throw error for non-existent arc', () => {
    expect(() =>
      arcResume({
        arc: 'nonexistent',
        contentPath: '../timeline-eros/content',
        docsPath: '../timeline-eros/docs',
      }),
    ).toThrow();
  });
});
