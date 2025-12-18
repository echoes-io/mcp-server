import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ChapterMetadata, TextStats } from '../../src/types/frontmatter.js';

describe('ChapterMetadata', () => {
  it('should have valid structure', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // pov
        fc.string({ minLength: 1 }), // title
        fc.string({ minLength: 1 }), // date
        fc.string({ minLength: 1 }), // timeline
        fc.string({ minLength: 1 }), // arc
        fc.integer({ min: 1 }), // episode
        fc.integer({ min: 1 }), // part
        fc.integer({ min: 1 }), // chapter
        fc.string({ minLength: 1 }), // summary
        fc.string({ minLength: 1 }), // location
        fc.option(fc.string(), { nil: undefined }), // outfit
        fc.option(fc.string(), { nil: undefined }), // kink
        (
          pov,
          title,
          date,
          timeline,
          arc,
          episode,
          part,
          chapter,
          summary,
          location,
          outfit,
          kink,
        ) => {
          const metadata: ChapterMetadata = {
            pov,
            title,
            date,
            timeline,
            arc,
            episode,
            part,
            chapter,
            summary,
            location,
            outfit,
            kink,
          };

          // Basic type checks
          expect(typeof metadata.pov).toBe('string');
          expect(typeof metadata.episode).toBe('number');
          expect(metadata.episode).toBeGreaterThan(0);
          expect(metadata.part).toBeGreaterThan(0);
          expect(metadata.chapter).toBeGreaterThan(0);
        },
      ),
    );
  });
});

describe('TextStats', () => {
  it('should have non-negative numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0 }), // words
        fc.integer({ min: 0 }), // characters
        fc.integer({ min: 0 }), // paragraphs
        fc.integer({ min: 0 }), // sentences
        fc.integer({ min: 0 }), // readingTimeMinutes
        (words, characters, paragraphs, sentences, readingTimeMinutes) => {
          // charactersNoSpaces should be <= characters
          const charactersNoSpaces = fc.sample(fc.integer({ min: 0, max: characters }), 1)[0];

          const stats: TextStats = {
            words,
            characters,
            charactersNoSpaces,
            paragraphs,
            sentences,
            readingTimeMinutes,
          };

          expect(stats.words).toBeGreaterThanOrEqual(0);
          expect(stats.characters).toBeGreaterThanOrEqual(0);
          expect(stats.charactersNoSpaces).toBeGreaterThanOrEqual(0);
          expect(stats.paragraphs).toBeGreaterThanOrEqual(0);
          expect(stats.sentences).toBeGreaterThanOrEqual(0);
          expect(stats.readingTimeMinutes).toBeGreaterThanOrEqual(0);
          expect(stats.charactersNoSpaces).toBeLessThanOrEqual(stats.characters);
        },
      ),
    );
  });
});
