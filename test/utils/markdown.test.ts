import { describe, expect, it } from 'vitest';

import { getTextStats, parseMarkdown } from '../../src/utils/markdown.js';

describe('parseMarkdown', () => {
  it('should parse frontmatter and content', () => {
    const markdown = `---
pov: Alice
title: Test Chapter
date: 2024-01-01
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: A test
location: Home
---

# Chapter 1

Some content here.`;

    const result = parseMarkdown(markdown);

    expect(result.metadata.pov).toBe('Alice');
    expect(result.metadata.title).toBe('Test Chapter');
    expect(result.metadata.episode).toBe(1);
    expect(result.content).toBe('# Chapter 1\n\nSome content here.');
  });

  it('should convert Date objects to strings', () => {
    const markdown = `---
pov: Bob
title: Test
date: 2024-01-01T10:00:00Z
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: Test
location: Home
---

Content`;

    const result = parseMarkdown(markdown);
    expect(typeof result.metadata.date).toBe('string');
  });
});

describe('getTextStats', () => {
  it('should calculate basic text statistics', () => {
    const markdown = `---
pov: Alice
title: Test
date: 2024-01-01
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: Test
location: Home
---

# Chapter

This is a test. It has multiple sentences!

Another paragraph here.`;

    const stats = getTextStats(markdown);

    expect(stats.words).toBeGreaterThan(0);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.paragraphs).toBe(2);
    expect(stats.sentences).toBe(3); // "This is a test", "It has multiple sentences", "Another paragraph here"
    expect(stats.readingTimeMinutes).toBeGreaterThan(0);
  });

  it('should handle empty content', () => {
    const markdown = `---
pov: Alice
title: Test
date: 2024-01-01
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: Test
location: Home
---

`;

    const stats = getTextStats(markdown);

    expect(stats.words).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.sentences).toBe(0);
  });
});
