import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectTimeline, loadConfig } from '../lib/config.js';

describe('detectTimeline', () => {
  it('detects timeline from path', () => {
    expect(detectTimeline('/home/user/projects/timeline-eros/content')).toBe('eros');
    expect(detectTimeline('/home/user/timeline-glow')).toBe('glow');
    expect(detectTimeline('/home/user/timeline-anima/arc1')).toBe('anima');
    expect(detectTimeline('/home/user/timeline-pulse')).toBe('pulse');
  });

  it('detects custom timeline names', () => {
    expect(detectTimeline('/home/user/timeline-my-custom')).toBe('my-custom');
    expect(detectTimeline('/home/user/timeline-test123')).toBe('test123');
  });

  it('returns undefined when no timeline detected', () => {
    expect(detectTimeline('/home/user/projects/other-repo')).toBeUndefined();
    expect(detectTimeline('/home/user/projects')).toBeUndefined();
  });
});

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads config from env vars', () => {
    process.env.PUBLISHER_API_URL = 'https://test.appsync-api.eu-west-1.amazonaws.com/graphql';
    process.env.PUBLISHER_API_KEY = 'da2-test123';

    const config = loadConfig();
    expect(config.publisherApiUrl).toBe('https://test.appsync-api.eu-west-1.amazonaws.com/graphql');
    expect(config.publisherApiKey).toBe('da2-test123');
  });

  it('throws if PUBLISHER_API_URL is missing', () => {
    process.env.PUBLISHER_API_KEY = 'da2-test123';
    delete process.env.PUBLISHER_API_URL;

    expect(() => loadConfig()).toThrow('PUBLISHER_API_URL');
  });

  it('throws if PUBLISHER_API_KEY is missing', () => {
    process.env.PUBLISHER_API_URL = 'https://test.appsync-api.eu-west-1.amazonaws.com/graphql';
    delete process.env.PUBLISHER_API_KEY;

    expect(() => loadConfig()).toThrow('PUBLISHER_API_KEY');
  });

  it('throws with both vars listed if both missing', () => {
    delete process.env.PUBLISHER_API_URL;
    delete process.env.PUBLISHER_API_KEY;

    expect(() => loadConfig()).toThrow('PUBLISHER_API_URL');
    expect(() => loadConfig()).toThrow('PUBLISHER_API_KEY');
  });

  it('detects timeline from cwd', () => {
    process.env.PUBLISHER_API_URL = 'https://test.appsync-api.eu-west-1.amazonaws.com/graphql';
    process.env.PUBLISHER_API_KEY = 'da2-test123';

    const spy = vi.spyOn(process, 'cwd').mockReturnValue('/home/user/timeline-eros');
    const config = loadConfig();
    expect(config.timeline).toBe('eros');
    spy.mockRestore();
  });
});
