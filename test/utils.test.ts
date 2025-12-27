import { describe, expect, it } from 'vitest';

import { getPackageConfig, parseChapter, parseMarkdown } from '../lib/utils.js';

describe('getPackageConfig', () => {
  it('returns package name, description and version', () => {
    const config = getPackageConfig();

    expect(config.name).toBe('@echoes-io/mcp-server');
    expect(config.description).toContain('Model Context Protocol');
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('parseMarkdown', () => {
  it('parses frontmatter and content', () => {
    const markdown = `---
pov: Alice
title: Test Chapter
date: 2024-01-01 Monday
---

This is the content.`;

    const result = parseMarkdown(markdown);

    expect(result.metadata.pov).toBe('Alice');
    expect(result.metadata.title).toBe('Test Chapter');
    expect(result.metadata.date).toBe('2024-01-01 Monday');
    expect(result.content).toBe('This is the content.');
  });

  it('handles markdown without frontmatter', () => {
    const result = parseMarkdown('Just plain content.');

    expect(result.metadata).toEqual({});
    expect(result.content).toBe('Just plain content.');
  });

  it('converts Date objects to ISO strings', () => {
    const result = parseMarkdown(`---
date: 2024-01-15
---

Content.`);

    expect(result.metadata.date).toBe('2024-01-15');
  });

  it('trims content whitespace', () => {
    const result = parseMarkdown(`---
title: Test
---

  Content with spaces.

`);

    expect(result.content).toBe('Content with spaces.');
  });
});

describe('parseChapter', () => {
  it('extracts metadata, content, and stats', () => {
    const result = parseChapter(`---
pov: Alice
title: Test
---

One two three four five.`);

    expect(result.metadata.pov).toBe('Alice');
    expect(result.content).toBe('One two three four five.');
    expect(result.stats.wordCount).toBe(5);
  });

  it('computes all text statistics', () => {
    const result = parseChapter(`---
title: Test
---

First paragraph here.

Second paragraph here.`);

    expect(result.stats.wordCount).toBe(6);
    expect(result.stats.charCount).toBeGreaterThan(0);
    expect(result.stats.charCountWithSpaces).toBeGreaterThan(result.stats.charCount);
    expect(result.stats.paragraphCount).toBe(2);
    expect(result.stats.sentenceCount).toBe(2);
    expect(result.stats.readingTimeMinutes).toBe(1);
  });

  it('strips markdown headers from stats', () => {
    const result = parseChapter(`---
title: Test
---

# Header

Content here.`);

    expect(result.stats.wordCount).toBe(2);
  });

  it('provides plain text without markdown', () => {
    const result = parseChapter(`---
title: Test
---

**Bold** and *italic* text.`);

    expect(result.plainText).toBe('Bold and italic text.');
  });

  it('handles empty content', () => {
    const result = parseChapter(`---
title: Empty
---
`);

    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.paragraphCount).toBe(0);
  });
});
