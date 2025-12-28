import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkKinkFirsts } from '../../../lib/tools/consistency/rules/kink-firsts.js';

describe('kink-firsts rule', () => {
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
    const file = join(dir, `ch${String(chapter).padStart(3, '0')}.md`);
    writeFileSync(
      file,
      `---
arc: ${arc}
episode: ${episode}
chapter: ${chapter}
pov: test
title: Test Chapter
kink: "${kink}"
---

# Test Chapter

Content here.
`,
    );
  }

  it('returns empty array when no duplicates', async () => {
    writeChapter('arc1', 1, 1, 'primo-bacio');
    writeChapter('arc1', 1, 2, 'primo-plug');
    writeChapter('arc1', 1, 3, 'esibizionismo');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects duplicate primo-* kinks', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug, training');
    writeChapter('arc1', 1, 5, 'primo-plug, altro');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('KINK_FIRST_DUPLICATE');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].current).toEqual({ arc: 'arc1', episode: 1, chapter: 5 });
    expect(issues[0].previous).toEqual({ arc: 'arc1', episode: 1, chapter: 1 });
    expect(issues[0].details.normalizedSubject).toBe('plug');
  });

  it('detects duplicate first-* kinks', async () => {
    writeChapter('arc1', 1, 1, 'first-kiss');
    writeChapter('arc1', 2, 1, 'first-kiss');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('KINK_FIRST_DUPLICATE');
  });

  it('normalizes different formats of same kink', async () => {
    writeChapter('arc1', 1, 1, 'primo-bacio');
    writeChapter('arc1', 1, 2, 'primo bacio'); // space instead of dash
    writeChapter('arc1', 1, 3, 'Primo-Bacio'); // different case

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(2); // ch2 and ch3 duplicate ch1
  });

  it('ignores non-first kinks', async () => {
    writeChapter('arc1', 1, 1, 'anal, esibizionismo');
    writeChapter('arc1', 1, 2, 'anal, voyeurismo');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('only checks specified arc', async () => {
    writeChapter('arc1', 1, 1, 'primo-plug');
    writeChapter('arc2', 1, 1, 'primo-plug');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(0); // arc2 is ignored
  });

  it('handles chapters without kink field', async () => {
    const dir = join(testDir, 'arc1', 'ep01');
    writeFileSync(
      join(dir, 'ch001.md'),
      `---
arc: arc1
episode: 1
chapter: 1
pov: test
title: No Kink
---

Content.
`,
    );

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('processes chapters in order', async () => {
    // Write out of order
    writeChapter('arc1', 2, 1, 'primo-plug');
    writeChapter('arc1', 1, 1, 'primo-plug');

    const issues = await checkKinkFirsts(testDir, 'arc1');
    expect(issues).toHaveLength(1);
    // ep1:ch1 should be first, ep2:ch1 should be duplicate
    expect(issues[0].previous).toEqual({ arc: 'arc1', episode: 1, chapter: 1 });
    expect(issues[0].current).toEqual({ arc: 'arc1', episode: 2, chapter: 1 });
  });
});
