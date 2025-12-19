import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { indexRag } from '../../src/tools/index-rag.js';

describe('index-rag tool', () => {
  const testDir = '/tmp/test-index-rag';
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

    // Create test chapter files with character mentions
    const chapter1 = `---
title: Test Chapter 1
pov: Alice
arc: arc1
episode: 1
chapter: 1
summary: First chapter summary
location: Test Location
---

# Test Chapter 1

Alice walked into the room where Bob was waiting. "Hello Bob," she said.
Marco looked up from his book and smiled at Alice.`;

    const chapter2 = `---
title: Test Chapter 2
pov: Bob
arc: arc1
episode: 1
chapter: 2
summary: Second chapter summary
location: Another Location
---

# Test Chapter 2

Bob replied to Alice, "Nice to see you again."
Angi entered the conversation between Alice and Bob.`;

    writeFileSync(join(episodeDir, 'ep01-ch001-alice-test.md'), chapter1);
    writeFileSync(join(episodeDir, 'ep01-ch002-bob-test.md'), chapter2);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should index chapters into GraphRAG', async () => {
    const result = await indexRag({
      timeline,
      contentPath: testDir,
    });

    expect(result.indexed).toBe(2);
    expect(result.graphNodes).toBeGreaterThanOrEqual(0);
    expect(result.vectorEmbeddings).toBeGreaterThanOrEqual(0);
    expect(result.relationships).toBeGreaterThanOrEqual(0);
  });

  it('should filter by arc', async () => {
    const result = await indexRag({
      timeline,
      contentPath: testDir,
      arc: 'arc1',
    });

    expect(result.indexed).toBe(2);
  });

  it('should filter by episode', async () => {
    const result = await indexRag({
      timeline,
      contentPath: testDir,
      episode: 1,
    });

    expect(result.indexed).toBe(2);
  });

  it('should filter by non-existent arc', async () => {
    const result = await indexRag({
      timeline,
      contentPath: testDir,
      arc: 'non-existent',
    });

    expect(result.indexed).toBe(0);
  });

  it('should handle empty directory', async () => {
    const emptyDir = join(testDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });

    const result = await indexRag({
      timeline,
      contentPath: emptyDir,
    });

    expect(result.indexed).toBe(0);
    expect(result.graphNodes).toBe(0);
    expect(result.vectorEmbeddings).toBe(0);
  });
});
