import type { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import {
  getAvailableArcs,
  validateArcExists,
  validateArcNotExists,
} from '../../lib/prompts/validation.js';

describe('prompts validation', () => {
  describe('validateArcExists', () => {
    it('should return true for existing arc', async () => {
      const mockTracker = {
        getArcs: vi.fn().mockResolvedValue([{ name: 'work' }, { name: 'anima' }]),
      } as unknown as Tracker;

      const exists = await validateArcExists('work', mockTracker, 'test-timeline');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing arc', async () => {
      const mockTracker = {
        getArcs: vi.fn().mockResolvedValue([{ name: 'work' }, { name: 'anima' }]),
      } as unknown as Tracker;

      const exists = await validateArcExists('nonexistent', mockTracker, 'test-timeline');
      expect(exists).toBe(false);
    });
  });

  describe('validateArcNotExists', () => {
    it('should return false for existing arc', async () => {
      const mockTracker = {
        getArcs: vi.fn().mockResolvedValue([{ name: 'work' }, { name: 'anima' }]),
      } as unknown as Tracker;

      const notExists = await validateArcNotExists('work', mockTracker, 'test-timeline');
      expect(notExists).toBe(false);
    });

    it('should return true for non-existing arc', async () => {
      const mockTracker = {
        getArcs: vi.fn().mockResolvedValue([{ name: 'work' }, { name: 'anima' }]),
      } as unknown as Tracker;

      const notExists = await validateArcNotExists('newArc', mockTracker, 'test-timeline');
      expect(notExists).toBe(true);
    });
  });

  describe('getAvailableArcs', () => {
    it('should return list of arcs', async () => {
      const mockTracker = {
        getArcs: vi.fn().mockResolvedValue([{ name: 'work' }, { name: 'anima' }]),
      } as unknown as Tracker;

      const arcs = await getAvailableArcs(mockTracker, 'test-timeline');
      expect(arcs).toContain('work');
      expect(arcs).toContain('anima');
      expect(arcs).toHaveLength(2);
    });
  });
});
