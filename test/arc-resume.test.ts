import { describe, expect, it } from 'vitest';

import { getPrompt } from '../lib/prompts/index.js';

describe('arc-resume', () => {
  it('should load arc context with episode outline, characters, and recent chapters', () => {
    const result = getPrompt(
      'arc-resume',
      { arc: 'bloom', episode: '1', lastChapters: '2' },
      { contentPath: 'test/fixtures/content', docsPath: 'test/fixtures/docs' },
    );

    expect(result).toContain('# Arc Resume: bloom - Episode 1');
    expect(result).toContain('## Episode Outline');
    expect(result).toContain('## Characters');
    expect(result).toContain('## Recent Chapters');
  });

  it('should default to latest episode when episode not specified', () => {
    const result = getPrompt(
      'arc-resume',
      { arc: 'bloom' },
      { contentPath: 'test/fixtures/content', docsPath: 'test/fixtures/docs' },
    );

    expect(result).toContain('# Arc Resume: bloom - Episode');
    expect(result).toContain('## Episode Outline');
  });

  it('should throw error for non-existent arc', () => {
    expect(() =>
      getPrompt(
        'arc-resume',
        { arc: 'nonexistent' },
        { contentPath: 'test/fixtures/content', docsPath: 'test/fixtures/docs' },
      ),
    ).toThrow();
  });
});
