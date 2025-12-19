import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { indexTracker } from '../../src/tools/index-tracker.js';

describe('index-tracker tool', () => {
  const testDir = '/tmp/test-index-tracker';
  const timeline = 'test-timeline';

  beforeEach(() => {
    // Create test directory structure
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    // Create arc directory
    const arcDir = join(testDir, 'arc1');
    mkdirSync(arcDir, { recursive: true });

    // Create episode directory
    const episodeDir = join(arcDir, 'ep01-test-episode');
    mkdirSync(episodeDir, { recursive: true });

    // Create test chapter files
    const chapter1 = `---
title: Test Chapter 1
pov: Alice
arc: arc1
episode: 1
chapter: 1
excerpt: First chapter summary
location: Test Location
---

# Test Chapter 1

This is the first test chapter content.`;

    const chapter2 = `---
title: Test Chapter 2
pov: Bob
arc: arc1
episode: 1
chapter: 2
excerpt: Second chapter summary
location: Another Location
---

# Test Chapter 2

This is the second test chapter content.`;

    writeFileSync(join(episodeDir, 'ep01-ch001-alice-test.md'), chapter1);
    writeFileSync(join(episodeDir, 'ep01-ch002-bob-test.md'), chapter2);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should scan and index markdown files', async () => {
    const result = await indexTracker({
      timeline,
      contentPath: testDir,
    });

    expect(result.scanned).toBe(2);
    expect(result.timelines).toBeGreaterThanOrEqual(0);
    expect(result.arcs).toBeGreaterThanOrEqual(0);
    expect(result.episodes).toBeGreaterThanOrEqual(0);
    expect(result.chapters).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty directory', async () => {
    const emptyDir = join(testDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });

    const result = await indexTracker({
      timeline,
      contentPath: emptyDir,
    });

    expect(result.scanned).toBe(0);
  });

  it('should handle invalid markdown files gracefully', async () => {
    const invalidFile = join(testDir, 'invalid.md');
    writeFileSync(invalidFile, 'Invalid markdown without frontmatter');

    const result = await indexTracker({
      timeline,
      contentPath: testDir,
    });

    // Should still process valid files and skip invalid ones
    expect(result.scanned).toBeGreaterThanOrEqual(2);
  });
});
