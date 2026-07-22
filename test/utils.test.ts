import { describe, expect, it } from 'vitest';

import { getPackageConfig, parseChapter, parseMarkdown } from '../lib/utils.js';

describe('getPackageConfig', () => {
  it('returns package name, description, and version', () => {
    const config = getPackageConfig();
    expect(config.name).toBe('@echoes-io/mcp-server');
    expect(config.description).toBeTruthy();
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('parseMarkdown', () => {
  it('extracts frontmatter and content', () => {
    const result = parseMarkdown(`---
pov: Alice
title: Test
date: 2024-01-01
timeline: eros
arc: bloom
episode: 1
part: 1
chapter: 1
summary: A test
location: Café
---

Hello world.`);

    expect(result.metadata.pov).toBe('Alice');
    expect(result.metadata.title).toBe('Test');
    expect(result.metadata.arc).toBe('bloom');
    expect(result.content).toBe('Hello world.');
  });

  it('converts Date objects to ISO strings', () => {
    const result = parseMarkdown(`---
pov: Bob
title: Test
date: 2024-06-15
timeline: eros
arc: bloom
episode: 1
part: 1
chapter: 1
summary: A test
location: Home
---

Content.`);

    expect(result.metadata.date).toBe('2024-06-15');
  });
});

describe('parseChapter', () => {
  it('computes text statistics', () => {
    const result = parseChapter(`---
pov: Alice
title: Test
date: 2024-01-01
timeline: eros
arc: bloom
episode: 1
part: 1
chapter: 1
summary: A test
location: Café
---

## Scene 1

This is a test paragraph with some words. It has two sentences.

This is another paragraph.`);

    expect(result.metadata.pov).toBe('Alice');
    expect(result.stats.wordCount).toBeGreaterThan(0);
    expect(result.stats.paragraphCount).toBe(2);
    expect(result.stats.sentenceCount).toBe(3);
    expect(result.stats.charCount).toBeGreaterThan(0);
    expect(result.stats.charCountWithSpaces).toBeGreaterThan(result.stats.charCount);
    expect(result.stats.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it('strips markdown headers from plain text', () => {
    const result = parseChapter(`---
pov: Alice
title: Test
date: 2024-01-01
timeline: eros
arc: bloom
episode: 1
part: 1
chapter: 1
summary: A test
location: Café
---

## Header

Content here.`);

    expect(result.plainText).not.toContain('Header');
    expect(result.plainText).toContain('Content here.');
  });
});
