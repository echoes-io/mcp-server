import { describe, it, expect } from 'vitest';
import { getTextStats } from '../../../src/utils/text-stats.js';

describe('Text Stats', () => {
  it('should calculate correct text statistics', () => {
    const text = `This is a test paragraph with multiple sentences. Here's another sentence!

This is a second paragraph. It has more content.`;

    const stats = getTextStats(text);
    
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.paragraphs).toBe(2);
    expect(stats.sentences).toBeGreaterThan(2);
    expect(stats.readingTimeMinutes).toBeGreaterThan(0);
  });

  it('should handle empty text', () => {
    const stats = getTextStats('');
    
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.readingTimeMinutes).toBe(0);
  });

  it('should calculate reading time correctly', () => {
    // Assuming ~200 words per minute reading speed
    const longText = 'word '.repeat(200); // 200 words
    const stats = getTextStats(longText);
    
    expect(stats.words).toBe(200);
    expect(stats.readingTimeMinutes).toBeGreaterThan(0);
  });
});
