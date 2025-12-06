import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPrompt, listPrompts } from '../../lib/prompts/handlers.js';

describe('prompts handlers', () => {
  let mockTracker: Tracker;
  let testDir: string;
  let githubPromptsDir: string;
  let timelinePromptsDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original cwd first
    originalCwd = process.cwd();

    // Setup mock tracker
    mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    // Setup test directories
    testDir = join(originalCwd, 'test', 'prompts', 'tmp');
    githubPromptsDir = join(testDir, '..', '.github', '.kiro', 'prompts');
    timelinePromptsDir = join(testDir, '.kiro', 'prompts');

    await mkdir(githubPromptsDir, { recursive: true });
    await mkdir(timelinePromptsDir, { recursive: true });

    // Create base template
    await writeFile(
      join(githubPromptsDir, 'new-chapter.md'),
      'Base template for {TIMELINE} arc {ARC} chapter {CHAPTER}',
    );

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(join(originalCwd, 'test', 'prompts', 'tmp'), { recursive: true, force: true });
    await rm(join(originalCwd, 'test', 'prompts', '.github'), { recursive: true, force: true });
  });

  describe('listPrompts', () => {
    it('should return all 6 prompts', () => {
      const result = listPrompts();
      expect(result.prompts).toHaveLength(6);
      expect(result.prompts.map((p) => p.name)).toEqual([
        'new-chapter',
        'revise-chapter',
        'expand-chapter',
        'new-character',
        'new-episode',
        'new-arc',
      ]);
    });

    it('should include descriptions and arguments', () => {
      const result = listPrompts();
      const newChapter = result.prompts.find((p) => p.name === 'new-chapter');
      expect(newChapter?.description).toBeTruthy();
      expect(newChapter?.arguments).toHaveLength(2);
      expect(newChapter?.arguments[0].name).toBe('arc');
      expect(newChapter?.arguments[1].name).toBe('chapter');
    });
  });

  describe('getPrompt', () => {
    it('should load base template and substitute placeholders', async () => {
      const result = await getPrompt(
        'new-chapter',
        { arc: 'work', chapter: '1' },
        'test-timeline',
        mockTracker,
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toBe(
        'Base template for test-timeline arc work chapter 1',
      );
    });

    it('should concatenate base + override', async () => {
      // Create override
      await writeFile(
        join(timelinePromptsDir, 'new-chapter.md'),
        'Override for timeline-specific instructions',
      );

      const result = await getPrompt(
        'new-chapter',
        { arc: 'work', chapter: '1' },
        'test-timeline',
        mockTracker,
      );

      expect(result.messages[0].content.text).toContain('Base template');
      expect(result.messages[0].content.text).toContain('---');
      expect(result.messages[0].content.text).toContain('Override for timeline-specific');
    });

    it('should return error when .github repo not found', async () => {
      // Remove .github directory
      await rm(join(testDir, '..', '.github'), { recursive: true, force: true });

      const result = await getPrompt(
        'new-chapter',
        { arc: 'work', chapter: '1' },
        'test-timeline',
        mockTracker,
      );

      expect(result.messages[0].content.text).toContain('❌ Error');
      expect(result.messages[0].content.text).toContain('.github repository not found');
    });

    it('should return error when template not found', async () => {
      const result = await getPrompt(
        'nonexistent',
        { arc: 'work', chapter: '1' },
        'test-timeline',
        mockTracker,
      );

      expect(result.messages[0].content.text).toContain('❌ Error');
      expect(result.messages[0].content.text).toContain('Prompt template not found');
    });

    it('should return error when arc does not exist', async () => {
      const result = await getPrompt(
        'new-chapter',
        { arc: 'nonexistent', chapter: '1' },
        'test-timeline',
        mockTracker,
      );

      expect(result.messages[0].content.text).toContain('❌ Error');
      expect(result.messages[0].content.text).toContain('Arc "nonexistent" not found');
    });

    it('should handle non-Error exceptions', async () => {
      const badTracker = {
        getArcs: vi.fn().mockRejectedValue('string error'), // non-Error
      } as unknown as Tracker;

      const result = await getPrompt(
        'new-chapter',
        { arc: 'work', chapter: '1' },
        'test-timeline',
        badTracker,
      );

      expect(result.messages[0].content.text).toContain('❌ Error');
      expect(result.messages[0].content.text).toContain('Unknown error');
    });
  });
});
