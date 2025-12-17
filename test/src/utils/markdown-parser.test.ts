import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../../src/utils/markdown-parser.js';

describe('Markdown Parser', () => {
  it('should parse markdown with frontmatter', () => {
    const markdown = `---
pov: Alice
title: Test Chapter
date: 2024-01-01
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: Test summary
location: Test location
---

# Chapter Content

This is the chapter content with **bold** text.`;

    const result = parseMarkdown(markdown);
    
    expect(result.metadata.pov).toBe('Alice');
    expect(result.metadata.title).toBe('Test Chapter');
    expect(result.content).toContain('Chapter Content');
    expect(result.content).toContain('**bold**');
  });

  it('should handle markdown without frontmatter', () => {
    const markdown = `# Just Content

No frontmatter here.`;

    const result = parseMarkdown(markdown);
    
    expect(result.metadata).toEqual({});
    expect(result.content).toBe(markdown);
  });

  it('should convert Date objects to strings', () => {
    const markdown = `---
pov: Alice
title: Test Chapter
date: 2024-01-01
timeline: test
arc: arc1
episode: 1
part: 1
chapter: 1
summary: Test summary
location: Test location
---

Content here.`;

    const result = parseMarkdown(markdown);
    
    // Should be string, not Date object
    expect(typeof result.metadata.date).toBe('string');
    expect(result.metadata.date).toBe('2024-01-01');
  });
});
