import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/utils/markdown-parser.js';
import { getTextStats } from '../../src/utils/text-stats.js';
import { validateChapterMetadata, validateTextStats } from '../../src/schemas/metadata.js';
import type { Chapter } from '../../src/types/chapter.js';

describe('Integration Tests', () => {
  it('should process complete chapter workflow', () => {
    // Simulate a complete chapter file
    const chapterMarkdown = `---
pov: Alice
title: The Beginning
date: 2024-01-01
timeline: pulse
arc: work
episode: 1
part: 1
chapter: 1
summary: Alice starts her new job
location: Office building
outfit: Business suit
---

# The Beginning

Alice walked into the gleaming office building, her heart racing with anticipation. This was it—her first day at the company she'd dreamed of joining.

The elevator hummed quietly as it carried her to the fifteenth floor. She checked her reflection in the polished steel doors, adjusting her business suit one final time.

"You've got this," she whispered to herself as the doors opened.`;

    // Step 1: Parse markdown
    const parsed = parseMarkdown(chapterMarkdown);
    
    // Step 2: Validate metadata
    expect(() => validateChapterMetadata(parsed.metadata)).not.toThrow();
    
    // Step 3: Calculate text stats
    const stats = getTextStats(parsed.content);
    expect(() => validateTextStats(stats)).not.toThrow();
    
    // Step 4: Create complete Chapter object
    const chapter: Chapter = {
      // From parsed metadata
      ...parsed.metadata,
      // From calculated stats
      ...stats,
      // Chapter-specific fields
      timelineName: parsed.metadata.timeline,
      arcName: parsed.metadata.arc,
      episodeNumber: parsed.metadata.episode,
      partNumber: parsed.metadata.part,
      number: parsed.metadata.chapter
    };
    
    // Verify the complete chapter object
    expect(chapter.pov).toBe('Alice');
    expect(chapter.title).toBe('The Beginning');
    expect(chapter.timeline).toBe('pulse');
    expect(chapter.timelineName).toBe('pulse');
    expect(chapter.words).toBeGreaterThan(50);
    expect(chapter.paragraphs).toBeGreaterThan(2);
    expect(chapter.readingTimeMinutes).toBeGreaterThan(0);
  });

  it('should handle chapter with minimal metadata', () => {
    const minimalMarkdown = `---
pov: Bob
title: Quick Note
date: 2024-01-02
timeline: test
arc: misc
episode: 1
part: 1
chapter: 1
summary: A brief note
location: Home
---

Just a quick note.`;

    const parsed = parseMarkdown(minimalMarkdown);
    const stats = getTextStats(parsed.content);
    
    // Should still validate
    expect(() => validateChapterMetadata(parsed.metadata)).not.toThrow();
    expect(() => validateTextStats(stats)).not.toThrow();
    
    // Should have minimal but valid stats
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.sentences).toBeGreaterThan(0);
  });

  it('should reject invalid chapter data', () => {
    const invalidMarkdown = `---
pov: ""
title: ""
episode: -1
---

Content here.`;

    const parsed = parseMarkdown(invalidMarkdown);
    
    // Should throw validation errors
    expect(() => validateChapterMetadata(parsed.metadata)).toThrow();
  });
});
