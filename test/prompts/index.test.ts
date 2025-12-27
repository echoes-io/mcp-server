import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getPrompt, PROMPTS } from '../../lib/prompts/index.js';

describe('prompts', () => {
  let tempDir: string;
  let githubPath: string;
  let contentPath: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-prompts-test-'));

    // Create .github prompts structure
    githubPath = join(tempDir, '.github', '.kiro', 'prompts');
    mkdirSync(githubPath, { recursive: true });

    // Create content directory with an arc
    contentPath = join(tempDir, 'timeline', 'content');
    mkdirSync(join(contentPath, 'bloom'), { recursive: true });

    // Change to timeline directory
    process.chdir(join(tempDir, 'timeline'));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true });
  });

  describe('PROMPTS', () => {
    it('exports all prompt configs', () => {
      expect(PROMPTS).toHaveLength(7);
      expect(PROMPTS.map((p) => p.name)).toEqual([
        'new-chapter',
        'revise-chapter',
        'expand-chapter',
        'new-character',
        'new-episode',
        'new-arc',
        'revise-arc',
      ]);
    });
  });

  describe('getPrompt', () => {
    it('loads and substitutes template', () => {
      writeFileSync(
        join(githubPath, 'new-chapter.md'),
        'Create chapter {CHAPTER} for arc {ARC} in {TIMELINE}',
      );

      const result = getPrompt(
        'new-chapter',
        { arc: 'bloom', chapter: '1' },
        { contentPath, timeline: 'anima' },
      );

      expect(result).toBe('Create chapter 1 for arc bloom in anima');
    });

    it('appends local override', () => {
      writeFileSync(join(githubPath, 'new-chapter.md'), 'Base template');

      const localPath = join(tempDir, 'timeline', '.kiro', 'prompts');
      mkdirSync(localPath, { recursive: true });
      writeFileSync(join(localPath, 'new-chapter.md'), 'Local override');

      const result = getPrompt('new-chapter', { arc: 'bloom', chapter: '1' }, { contentPath });

      expect(result).toBe('Base template\n\n---\n\nLocal override');
    });

    it('throws if .github repo not found', () => {
      rmSync(join(tempDir, '.github'), { recursive: true });

      expect(() =>
        getPrompt('new-chapter', { arc: 'bloom', chapter: '1' }, { contentPath }),
      ).toThrow('.github repository not found');
    });

    it('throws if template not found', () => {
      expect(() => getPrompt('unknown-prompt', {}, { contentPath })).toThrow(
        'Prompt template not found: unknown-prompt.md',
      );
    });

    describe('validation', () => {
      beforeEach(() => {
        writeFileSync(join(githubPath, 'new-chapter.md'), 'Template');
        writeFileSync(join(githubPath, 'expand-chapter.md'), 'Template');
        writeFileSync(join(githubPath, 'new-episode.md'), 'Template');
        writeFileSync(join(githubPath, 'new-arc.md'), 'Template');
        writeFileSync(join(githubPath, 'revise-arc.md'), 'Template');
      });

      it('validates arc exists for new-chapter', () => {
        expect(() =>
          getPrompt('new-chapter', { arc: 'unknown', chapter: '1' }, { contentPath }),
        ).toThrow('Arc "unknown" not found');
      });

      it('validates chapter is number', () => {
        expect(() =>
          getPrompt('new-chapter', { arc: 'bloom', chapter: 'abc' }, { contentPath }),
        ).toThrow('Chapter must be a number');
      });

      it('validates target is number for expand-chapter', () => {
        expect(() =>
          getPrompt(
            'expand-chapter',
            { arc: 'bloom', chapter: '1', target: 'abc' },
            { contentPath },
          ),
        ).toThrow('Target must be a number');
      });

      it('validates episode is number', () => {
        expect(() =>
          getPrompt('new-episode', { arc: 'bloom', episode: 'abc' }, { contentPath }),
        ).toThrow('Episode must be a number');
      });

      it('validates arc does not exist for new-arc', () => {
        expect(() => getPrompt('new-arc', { name: 'bloom' }, { contentPath })).toThrow(
          'Arc "bloom" already exists',
        );
      });

      it('validates arc exists for revise-arc', () => {
        expect(() => getPrompt('revise-arc', { arc: 'unknown' }, { contentPath })).toThrow(
          'Arc "unknown" not found',
        );
      });

      it('passes validation for new-character', () => {
        writeFileSync(join(githubPath, 'new-character.md'), 'Create {NAME}');
        const result = getPrompt('new-character', { name: 'Alice' }, { contentPath });
        expect(result).toBe('Create Alice');
      });

      it('passes validation for new-arc when arc does not exist', () => {
        writeFileSync(join(githubPath, 'new-arc.md'), 'Create arc {NAME}');
        const result = getPrompt('new-arc', { name: 'newark' }, { contentPath });
        expect(result).toBe('Create arc newark');
      });

      it('passes validation for revise-arc when arc exists', () => {
        writeFileSync(join(githubPath, 'revise-arc.md'), 'Revise {ARC}');
        const result = getPrompt('revise-arc', { arc: 'bloom' }, { contentPath });
        expect(result).toBe('Revise bloom');
      });
    });
  });
});
