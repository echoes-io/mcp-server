import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getTimeline } from '../lib/utils.js';

describe('utils', () => {
  beforeEach(() => {
    delete process.env.ECHOES_TIMELINE;
  });

  afterEach(() => {
    delete process.env.ECHOES_TIMELINE;
  });

  describe('getTimeline', () => {
    it('should return timeline from env var', () => {
      process.env.ECHOES_TIMELINE = 'test-timeline';
      expect(getTimeline()).toBe('test-timeline');
    });

    it('should throw error if env var not set', () => {
      expect(() => getTimeline()).toThrow('ECHOES_TIMELINE environment variable is not set');
    });
  });
});
