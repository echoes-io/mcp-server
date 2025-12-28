import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkOutfitClaims } from '../../../lib/tools/consistency/rules/outfit-claims.js';

describe('checkOutfitClaims', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(process.cwd(), 'test-outfit-claims');
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect outfit contradiction', async () => {
    // Chapter 1: Character wears minigonna
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: minigonna nera, top bianco"
---

Alice indossa la sua minigonna preferita.
`,
    );

    // Chapter 2: Claims never worn minigonna
    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Alice
title: Second Chapter
---

Alice guardò la minigonna nell'armadio. Non l'aveva mai indossato prima d'ora.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      type: 'OUTFIT_CONTRADICTION',
      severity: 'warning',
      message: 'Claim "never worn minigonna" contradicts earlier outfit',
      current: { arc: 'test', episode: 1, chapter: 2 },
      previous: { arc: 'test', episode: 1, chapter: 1 },
      details: {
        item: 'minigonna',
        previousOutfit: 'Alice: minigonna nera, top bianco',
      },
    });
  });

  it('should handle multiple characters in outfit field', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: gonna lunga | Bob: camicia bianca"
---

Content here.
`,
    );

    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Bob
title: Second Chapter
---

Bob non aveva mai messo una camicia così elegante.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(1);
    expect(issues[0].details.item).toBe('camicia');
  });

  it('should detect multiple items in same claim', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: vestito rosso, tacchi alti"
---

Content here.
`,
    );

    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Alice
title: Second Chapter
---

Alice non aveva mai indossato un vestito così elegante e tacchi così alti.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(2); // One for vestito, one for tacchi
    expect(issues.map((i) => i.details.item)).toEqual(
      expect.arrayContaining(['vestito', 'tacchi']),
    );
  });

  it('should ignore different arcs', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: other
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: minigonna nera"
---

Content here.
`,
    );

    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: Second Chapter
---

Alice non aveva mai indossato una minigonna.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(0);
  });

  it('should respect chapter order', async () => {
    // Later chapter has outfit
    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Alice
title: Second Chapter
outfit: "Alice: gonna corta"
---

Content here.
`,
    );

    // Earlier chapter claims never worn
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
---

Alice non aveva mai portato una gonna così corta.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(0); // No contradiction since outfit comes after claim
  });

  it('should handle various never worn patterns', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: bikini rosso"
---

Content here.
`,
    );

    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Alice
title: Second Chapter
---

Alice aveva comprato quel bikini ma non l'aveva mai messo prima.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(1);
    expect(issues[0].details.item).toBe('bikini');
  });

  it('should return empty array when no claims found', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "Alice: vestito blu"
---

Alice indossa il suo vestito preferito.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(0);
  });

  it('should handle outfit field without character prefix', async () => {
    writeFileSync(
      join(testDir, 'ch001.md'),
      `---
arc: test
episode: 1
chapter: 1
pov: Alice
title: First Chapter
outfit: "gonna rossa, camicia bianca"
---

Content here.
`,
    );

    writeFileSync(
      join(testDir, 'ch002.md'),
      `---
arc: test
episode: 1
chapter: 2
pov: Alice
title: Second Chapter
---

Alice non aveva mai indossato una gonna così elegante.
`,
    );

    const issues = await checkOutfitClaims(testDir, 'test');

    expect(issues).toHaveLength(1);
    expect(issues[0].details.item).toBe('gonna');
  });
});
