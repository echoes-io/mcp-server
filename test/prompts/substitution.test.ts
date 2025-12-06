import type { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import { substitutePlaceholders } from '../../lib/prompts/substitution.js';

describe('prompts substitution', () => {
  it('should replace basic placeholders', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Timeline: {TIMELINE}, Arc: {ARC}, Chapter: {CHAPTER}';
    const result = await substitutePlaceholders(
      'new-chapter',
      template,
      { arc: 'work', chapter: '1' },
      'test-timeline',
      mockTracker,
    );

    expect(result).toBe('Timeline: test-timeline, Arc: work, Chapter: 1');
  });

  it('should validate arc exists for new-chapter', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-chapter',
        template,
        { arc: 'nonexistent', chapter: '1' },
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Arc "nonexistent" not found');
  });

  it('should validate chapter is a number', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-chapter',
        template,
        { arc: 'work', chapter: 'abc' },
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Chapter must be a number');
  });

  it('should validate arc does not exist for new-arc', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders('new-arc', template, { name: 'work' }, 'test-timeline', mockTracker),
    ).rejects.toThrow('Arc "work" already exists');
  });

  it('should allow new arc name for new-arc', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Arc: {NAME}';
    const result = await substitutePlaceholders(
      'new-arc',
      template,
      { name: 'newArc' },
      'test-timeline',
      mockTracker,
    );

    expect(result).toBe('Arc: newArc');
  });

  it('should handle expand-chapter with target', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Target: {TARGET} words';
    const result = await substitutePlaceholders(
      'expand-chapter',
      template,
      { arc: 'work', chapter: '1', target: '4000' },
      'test-timeline',
      mockTracker,
    );

    expect(result).toBe('Target: 4000 words');
  });

  it('should throw error when arc argument is missing', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-chapter',
        template,
        { chapter: '1' }, // missing arc
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Missing required argument: arc');
  });

  it('should throw error when chapter argument is missing', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-chapter',
        template,
        { arc: 'work' }, // missing chapter
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Missing required argument: chapter');
  });

  it('should throw error when name argument is missing for new-arc', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([{ name: 'work' }]),
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-arc',
        template,
        {}, // missing name
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Missing required argument: name');
  });

  it('should show "none" when no arcs are available', async () => {
    const mockTracker = {
      getArcs: vi.fn().mockResolvedValue([]), // empty arcs
    } as unknown as Tracker;

    const template = 'Test';
    await expect(
      substitutePlaceholders(
        'new-chapter',
        template,
        { arc: 'nonexistent', chapter: '1' },
        'test-timeline',
        mockTracker,
      ),
    ).rejects.toThrow('Available arcs: none');
  });
});
