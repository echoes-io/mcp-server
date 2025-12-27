import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scanChapter, scanTimeline } from '../../lib/indexer/scanner.js';

describe('scanner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-scanner-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  const createChapterFile = (
    arc: string,
    episode: number,
    chapter: number,
    content = 'Test content.',
  ) => {
    const arcDir = join(tempDir, arc);
    const epDir = join(arcDir, `ep${String(episode).padStart(2, '0')}`);
    mkdirSync(epDir, { recursive: true });

    const fileName = `ch${String(chapter).padStart(3, '0')}.md`;
    const filePath = join(epDir, fileName);

    const markdown = `---
pov: Alice
title: Chapter ${chapter}
arc: ${arc}
episode: ${episode}
chapter: ${chapter}
location: Castle
date: 2024-01-01
summary: A test chapter
---

${content}
`;

    writeFileSync(filePath, markdown);
    return filePath;
  };

  describe('scanChapter', () => {
    it('parses chapter metadata and content', () => {
      const filePath = createChapterFile('bloom', 1, 1, 'Hello world. This is a test.');

      const chapter = scanChapter(filePath, tempDir);

      expect(chapter.id).toBe('bloom:1:1');
      expect(chapter.arc).toBe('bloom');
      expect(chapter.episode).toBe(1);
      expect(chapter.chapter).toBe(1);
      expect(chapter.pov).toBe('Alice');
      expect(chapter.title).toBe('Chapter 1');
      expect(chapter.location).toBe('Castle');
      expect(chapter.content).toContain('Hello world');
    });

    it('computes file hash', () => {
      const filePath = createChapterFile('bloom', 1, 1);

      const chapter = scanChapter(filePath, tempDir);

      expect(chapter.file_hash).toHaveLength(16);
    });

    it('computes text statistics', () => {
      const filePath = createChapterFile('bloom', 1, 1, 'One two three four five.');

      const chapter = scanChapter(filePath, tempDir);

      expect(chapter.word_count).toBe(5);
      expect(chapter.char_count).toBeGreaterThan(0);
      expect(chapter.paragraph_count).toBe(1);
    });

    it('uses relative file path', () => {
      const filePath = createChapterFile('bloom', 1, 1);

      const chapter = scanChapter(filePath, tempDir);

      expect(chapter.file_path).toBe('bloom/ep01/ch001.md');
    });

    it('handles missing optional fields', () => {
      const arcDir = join(tempDir, 'test');
      mkdirSync(arcDir, { recursive: true });
      const filePath = join(arcDir, 'ch001.md');

      writeFileSync(
        filePath,
        `---
pov: Bob
title: Minimal
arc: test
episode: 1
chapter: 1
---

Content here.
`,
      );

      const chapter = scanChapter(filePath, tempDir);

      expect(chapter.location).toBe('');
      expect(chapter.date).toBe('');
      expect(chapter.summary).toBe('');
    });
  });

  describe('scanTimeline', () => {
    it('scans all chapters in directory', () => {
      createChapterFile('bloom', 1, 1);
      createChapterFile('bloom', 1, 2);
      createChapterFile('work', 1, 1);

      const result = scanTimeline(tempDir);

      expect(result.chapters).toHaveLength(3);
      expect(result.arcs).toEqual(['bloom', 'work']);
    });

    it('sorts chapters by arc, episode, chapter', () => {
      createChapterFile('work', 2, 1);
      createChapterFile('bloom', 1, 2);
      createChapterFile('bloom', 1, 1);
      createChapterFile('bloom', 2, 1);

      const result = scanTimeline(tempDir);

      expect(result.chapters.map((c) => c.id)).toEqual([
        'bloom:1:1',
        'bloom:1:2',
        'bloom:2:1',
        'work:2:1',
      ]);
    });

    it('filters by arc', () => {
      createChapterFile('bloom', 1, 1);
      createChapterFile('work', 1, 1);

      const result = scanTimeline(tempDir, 'bloom');

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0].arc).toBe('bloom');
    });

    it('skips files without valid frontmatter', () => {
      createChapterFile('bloom', 1, 1);

      // Create a README without frontmatter
      writeFileSync(join(tempDir, 'README.md'), '# Timeline\n\nThis is a readme.');

      const result = scanTimeline(tempDir);

      expect(result.chapters).toHaveLength(1);
    });

    it('ignores non-markdown files', () => {
      createChapterFile('bloom', 1, 1);

      // Create a non-markdown file
      writeFileSync(join(tempDir, 'notes.txt'), 'Some notes');

      const result = scanTimeline(tempDir);

      expect(result.chapters).toHaveLength(1);
    });

    it('returns empty result for empty directory', () => {
      const result = scanTimeline(tempDir);

      expect(result.chapters).toHaveLength(0);
      expect(result.arcs).toHaveLength(0);
    });
  });
});
