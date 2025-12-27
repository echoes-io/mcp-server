import { describe, expect, it } from 'vitest';

import { formatEta, formatProgressBar } from '../../lib/indexer/tasks.js';

describe('tasks helpers', () => {
  describe('formatProgressBar', () => {
    it('formats progress bar correctly', () => {
      expect(formatProgressBar(5, 10, 10)).toBe('[█████░░░░░] 5/10 (50%)');
    });

    it('handles zero total', () => {
      expect(formatProgressBar(0, 0, 10)).toBe('[░░░░░░░░░░] 0/0 (0%)');
    });

    it('handles complete progress', () => {
      expect(formatProgressBar(10, 10, 10)).toBe('[██████████] 10/10 (100%)');
    });
  });

  describe('formatEta', () => {
    it('returns calculating when current is 0', () => {
      expect(formatEta(Date.now(), 0, 10)).toBe('calculating...');
    });

    it('formats minutes correctly', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      // 1 item in 1 minute, 9 remaining = 9 minutes
      expect(formatEta(startTime, 1, 10)).toBe('9m');
    });

    it('formats hours and minutes for long durations', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      // 1 item in 1 minute, 120 remaining = 120 minutes = 2h 0m
      expect(formatEta(startTime, 1, 121)).toBe('2h 0m');
    });
  });
});
