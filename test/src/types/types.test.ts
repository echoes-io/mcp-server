import { describe, it, expect } from 'vitest';
import type { ChapterMetadata, TextStats } from '../../../src/types/metadata.js';
import type { Chapter } from '../../../src/types/chapter.js';

describe('Types', () => {
  it('should have correct ChapterMetadata type', () => {
    const metadata: ChapterMetadata = {
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
    
    expect(metadata.pov).toBe('Alice');
    expect(metadata.episode).toBe(1);
  });

  it('should have correct Chapter type extending metadata and stats', () => {
    const chapter: Chapter = {
      // ChapterMetadata
      pov: 'Bob',
      title: 'Test Chapter 2',
      date: '2024-01-02',
      timeline: 'test',
      arc: 'arc1',
      episode: 1,
      part: 1,
      chapter: 2,
      summary: 'Test summary 2',
      location: 'Test location 2',
      // TextStats
      words: 1000,
      characters: 5000,
      charactersNoSpaces: 4000,
      paragraphs: 10,
      sentences: 50,
      readingTimeMinutes: 4,
      // Chapter specific
      timelineName: 'test',
      arcName: 'arc1',
      episodeNumber: 1,
      partNumber: 1,
      number: 2
    };
    
    expect(chapter.pov).toBe('Bob');
    expect(chapter.words).toBe(1000);
    expect(chapter.timelineName).toBe('test');
  });
});
