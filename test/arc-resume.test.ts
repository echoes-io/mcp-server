import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateArcResumePrompt } from '../lib/prompts/arc-resume.js';
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

  it('should throw error for non-existent episode', () => {
    expect(() =>
      getPrompt(
        'arc-resume',
        { arc: 'bloom', episode: '99' },
        { contentPath: 'test/fixtures/content', docsPath: 'test/fixtures/docs' },
      ),
    ).toThrow('No chapters found for arc "bloom" episode 99');
  });

  describe('edge cases', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'echoes-arc-resume-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true });
    });

    it('should throw when arc has no markdown files', () => {
      const contentDir = join(tempDir, 'content');
      const docsDir = join(tempDir, 'docs', 'episodes');
      mkdirSync(join(contentDir, 'empty-arc'), { recursive: true });
      mkdirSync(docsDir, { recursive: true });
      writeFileSync(join(contentDir, 'empty-arc', 'readme.txt'), 'not markdown');

      expect(() =>
        generateArcResumePrompt('empty-arc', undefined, 3, contentDir, join(tempDir, 'docs')),
      ).toThrow('No chapters found for arc');
    });

    it('should throw when arc directory does not exist', () => {
      const contentDir = join(tempDir, 'content');
      mkdirSync(contentDir, { recursive: true });

      expect(() =>
        generateArcResumePrompt('missing', undefined, 3, contentDir, join(tempDir, 'docs')),
      ).toThrow('No chapters found for arc');
    });

    it('should throw when episode outline is missing', () => {
      const contentDir = join(tempDir, 'content');
      const docsDir = join(tempDir, 'docs');
      mkdirSync(join(contentDir, 'test-arc'), { recursive: true });
      mkdirSync(join(docsDir, 'episodes'), { recursive: true });
      writeFileSync(
        join(contentDir, 'test-arc', 'ch001.md'),
        '---\npov: Alice\ntitle: Test\narc: test-arc\nepisode: 1\nchapter: 1\n---\nContent',
      );

      expect(() => generateArcResumePrompt('test-arc', 1, 3, contentDir, docsDir)).toThrow(
        'Episode outline not found',
      );
    });

    it('should include excerpt when present', () => {
      const contentDir = join(tempDir, 'content');
      const docsDir = join(tempDir, 'docs');
      mkdirSync(join(contentDir, 'test-arc'), { recursive: true });
      mkdirSync(join(docsDir, 'episodes'), { recursive: true });
      mkdirSync(join(docsDir, 'characters', 'test-arc'), { recursive: true });
      writeFileSync(
        join(contentDir, 'test-arc', 'ch001.md'),
        '---\npov: Alice\ntitle: Test\narc: test-arc\nepisode: 1\nchapter: 1\nexcerpt: A brief summary\n---\nContent',
      );
      writeFileSync(join(docsDir, 'episodes', 'test-arc-ep01-test.md'), 'Episode outline');

      const result = generateArcResumePrompt('test-arc', 1, 3, contentDir, docsDir);

      expect(result).toContain('**Excerpt**: A brief summary');
    });
  });
});
