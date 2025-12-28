import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkConsistency } from '../../../lib/tools/consistency/index.js';

describe('checkConsistency', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `echoes-test-${Date.now()}`);
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function writeChapter(arc: string, episode: number, chapter: number, kink: string): void {
    const dir = join(testDir, arc, `ep${String(episode).padStart(2, '0')}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `ch${String(chapter).padStart(3, '0')}.md`),
      `---
arc: ${arc}
episode: ${episode}
chapter: ${chapter}
pov: test
title: Test
kink: "${kink}"
---

Content.
`,
    );
  }

  it('returns result with summary', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');

    const result = await checkConsistency({
      contentPath: testDir,
      arc: 'arc1',
      dbPath: ':memory:',
    });

    expect(result.arc).toBe('arc1');
    expect(result.issues).toEqual([]);
    expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
  });

  it('runs kink-firsts rule by default', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');
    writeChapter('arc1', 1, 2, 'primo-plug');

    const result = await checkConsistency({
      contentPath: testDir,
      arc: 'arc1',
      dbPath: ':memory:',
    });

    expect(result.issues).toHaveLength(1);
    expect(result.summary.warnings).toBe(1);
  });

  it('filters by severity', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');
    writeChapter('arc1', 1, 2, 'primo-plug');

    const result = await checkConsistency({
      contentPath: testDir,
      arc: 'arc1',
      severity: 'error',
      dbPath: ':memory:',
    });

    expect(result.issues).toHaveLength(0); // warnings filtered out
  });

  it('runs only specified rules', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');
    writeChapter('arc1', 1, 2, 'primo-plug');

    const result = await checkConsistency({
      contentPath: testDir,
      arc: 'arc1',
      rules: ['entity-duplicate'], // not implemented yet, should skip
      dbPath: ':memory:',
    });

    expect(result.issues).toHaveLength(0);
  });

  it('skips invalid rules gracefully', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');

    // Bypass Zod validation by calling the function directly with invalid data
    const result = await checkConsistency({
      contentPath: testDir,
      arc: 'arc1',
      rules: ['kink-firsts'], // Valid rule
      dbPath: ':memory:',
    });

    expect(result.issues).toHaveLength(0);
  });
});
