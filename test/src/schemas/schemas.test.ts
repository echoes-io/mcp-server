import { describe, it, expect } from 'vitest';
import { 
  ChapterMetadataSchema, 
  TextStatsSchema,
  validateChapterMetadata,
  validateTextStats 
} from '../../../src/schemas/metadata.js';

describe('Schemas', () => {
  it('should validate correct ChapterMetadata', () => {
    const validMetadata = {
      pov: 'Alice',
      title: 'Test Chapter',
      date: '2024-01-01',
      timeline: 'test',
      arc: 'arc1',
      episode: 1,
      part: 1,
      chapter: 1,
      summary: 'Test summary',
      location: 'Test location'
    };

    expect(() => validateChapterMetadata(validMetadata)).not.toThrow();
    const result = ChapterMetadataSchema.parse(validMetadata);
    expect(result.pov).toBe('Alice');
  });

  it('should reject invalid ChapterMetadata', () => {
    const invalidMetadata = {
      pov: '', // empty string should fail
      title: 'Test Chapter',
      episode: -1 // negative should fail
    };

    expect(() => validateChapterMetadata(invalidMetadata)).toThrow();
  });

  it('should validate correct TextStats', () => {
    const validStats = {
      words: 1000,
      characters: 5000,
      charactersNoSpaces: 4000,
      paragraphs: 10,
      sentences: 50,
      readingTimeMinutes: 4
    };

    expect(() => validateTextStats(validStats)).not.toThrow();
    const result = TextStatsSchema.parse(validStats);
    expect(result.words).toBe(1000);
  });

  it('should reject invalid TextStats', () => {
    const invalidStats = {
      words: -1, // negative should fail
      characters: 'not a number' // wrong type should fail
    };

    expect(() => validateTextStats(invalidStats)).toThrow();
  });
});
