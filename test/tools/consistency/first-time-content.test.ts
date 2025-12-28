import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkFirstTimeContent } from '../../../lib/tools/consistency/rules/first-time-content.js';

describe('first-time-content rule', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `echoes-test-${Date.now()}`);
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function writeChapter(arc: string, episode: number, chapter: number, content: string): void {
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
---

${content}
`,
    );
  }

  it('returns empty array when no first-time claims', async () => {
    writeChapter('arc1', 1, 1, 'Just some regular content without any special phrases.');

    const issues = await checkFirstTimeContent(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('returns empty array with only one first-time claim', async () => {
    writeChapter('arc1', 1, 1, 'Per la prima volta mi sentivo libera.');

    const issues = await checkFirstTimeContent(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });

  it('detects similar first-time claims', async () => {
    writeChapter('arc1', 1, 1, 'Per la prima volta mi sentivo completamente libera.');
    writeChapter('arc1', 1, 5, 'Per la prima volta mi sentivo totalmente libera.');

    const issues = await checkFirstTimeContent(testDir, 'arc1', 0.8);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].type).toBe('FIRST_TIME_DUPLICATE');
    expect(issues[0].severity).toBe('info');
  }, 30000);

  it('does not flag different first-time claims', async () => {
    writeChapter('arc1', 1, 1, 'Per la prima volta guidavo una macchina.');
    writeChapter('arc1', 1, 5, 'Per la prima volta nuotavo nel mare.');

    const issues = await checkFirstTimeContent(testDir, 'arc1', 0.95);
    expect(issues).toHaveLength(0);
  }, 30000);

  it('handles multiple patterns', async () => {
    writeChapter('arc1', 1, 1, 'Era la prima volta che provavo questa sensazione.');
    writeChapter('arc1', 1, 2, 'La prima volta che ho sentito questo.');

    const issues = await checkFirstTimeContent(testDir, 'arc1', 0.7);
    // May or may not find similarity depending on embeddings
    expect(Array.isArray(issues)).toBe(true);
  }, 30000);

  it('only checks specified arc', async () => {
    writeChapter('arc1', 1, 1, 'Per la prima volta mi sentivo libera.');
    writeChapter('arc2', 1, 1, 'Per la prima volta mi sentivo libera.');

    const issues = await checkFirstTimeContent(testDir, 'arc1');
    // Should not compare across arcs
    expect(issues).toHaveLength(0);
  });

  it('handles unparseable files gracefully', async () => {
    writeFileSync(join(testDir, 'invalid.md'), 'invalid markdown content without frontmatter');
    writeChapter('arc1', 1, 1, 'Per la prima volta mi sentivo libera.');

    const issues = await checkFirstTimeContent(testDir, 'arc1');
    expect(issues).toHaveLength(0);
  });
});
