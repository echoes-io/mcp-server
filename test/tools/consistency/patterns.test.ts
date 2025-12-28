import { describe, expect, it } from 'vitest';

import {
  extractFirstSubject,
  isFirstTimeKink,
  normalizeKinkToken,
  tokenizeKink,
} from '../../../lib/tools/consistency/patterns.js';

describe('patterns', () => {
  describe('normalizeKinkToken', () => {
    it('lowercases and removes accents', () => {
      expect(normalizeKinkToken('Primo-Bacio')).toBe('primo-bacio');
      expect(normalizeKinkToken('première-fois')).toBe('premiere-fois');
    });

    it('converts spaces and special chars to dashes', () => {
      expect(normalizeKinkToken('primo bacio')).toBe('primo-bacio');
      expect(normalizeKinkToken('first_time')).toBe('first-time');
    });

    it('collapses multiple dashes', () => {
      expect(normalizeKinkToken('primo--bacio')).toBe('primo-bacio');
      expect(normalizeKinkToken('primo   bacio')).toBe('primo-bacio');
    });

    it('trims leading/trailing dashes', () => {
      expect(normalizeKinkToken('-primo-')).toBe('primo');
      expect(normalizeKinkToken('  primo  ')).toBe('primo');
    });
  });

  describe('isFirstTimeKink', () => {
    it('detects primo-* patterns', () => {
      expect(isFirstTimeKink('primo-plug')).toBe(true);
      expect(isFirstTimeKink('primo-bacio')).toBe(true);
      expect(isFirstTimeKink('Primo-Anal')).toBe(true);
    });

    it('detects prima-* patterns', () => {
      expect(isFirstTimeKink('prima-volta')).toBe(true);
      expect(isFirstTimeKink('Prima-Esperienza')).toBe(true);
    });

    it('detects "primo " with space patterns', () => {
      expect(isFirstTimeKink('primo bacio')).toBe(true);
      expect(isFirstTimeKink('prima volta anal')).toBe(true);
    });

    it('detects first-* patterns', () => {
      expect(isFirstTimeKink('first-time')).toBe(true);
      expect(isFirstTimeKink('first-kiss')).toBe(true);
      expect(isFirstTimeKink('First-Anal')).toBe(true);
    });

    it('detects "first " with space patterns', () => {
      expect(isFirstTimeKink('first time')).toBe(true);
      expect(isFirstTimeKink('first kiss')).toBe(true);
    });

    it('returns false for non-first patterns', () => {
      expect(isFirstTimeKink('anal')).toBe(false);
      expect(isFirstTimeKink('bacio')).toBe(false);
      expect(isFirstTimeKink('esibizionismo')).toBe(false);
      expect(isFirstTimeKink('training-anale')).toBe(false);
    });
  });

  describe('extractFirstSubject', () => {
    it('extracts subject from primo-* patterns', () => {
      expect(extractFirstSubject('primo-plug')).toBe('plug');
      expect(extractFirstSubject('primo-bacio')).toBe('bacio');
      expect(extractFirstSubject('Primo-Anal')).toBe('anal');
    });

    it('extracts subject from prima-* patterns', () => {
      expect(extractFirstSubject('prima-volta')).toBe('volta');
    });

    it('extracts subject from first-* patterns', () => {
      expect(extractFirstSubject('first-time')).toBe('time');
      expect(extractFirstSubject('first-kiss')).toBe('kiss');
    });

    it('extracts subject from space-separated patterns', () => {
      expect(extractFirstSubject('primo bacio')).toBe('bacio');
      expect(extractFirstSubject('first time')).toBe('time');
    });

    it('returns null for non-first patterns', () => {
      expect(extractFirstSubject('anal')).toBeNull();
      expect(extractFirstSubject('training-anale')).toBeNull();
    });
  });

  describe('tokenizeKink', () => {
    it('splits by comma', () => {
      expect(tokenizeKink('primo-plug, training-anale, preparazione')).toEqual([
        'primo-plug',
        'training-anale',
        'preparazione',
      ]);
    });

    it('splits by pipe', () => {
      expect(tokenizeKink('primo-plug | training-anale')).toEqual(['primo-plug', 'training-anale']);
    });

    it('trims whitespace', () => {
      expect(tokenizeKink('  primo-plug  ,  anal  ')).toEqual(['primo-plug', 'anal']);
    });

    it('filters empty tokens', () => {
      expect(tokenizeKink('primo-plug,,anal')).toEqual(['primo-plug', 'anal']);
    });
  });
});
