import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { program } from '../cli/program.js';

describe('CLI check-consistency command', () => {
  let testDir: string;
  let mockLog: Mock<typeof console.log>;
  let mockError: Mock<typeof console.error>;
  let mockExit: Mock<typeof process.exit>;

  beforeEach(() => {
    testDir = join(tmpdir(), `cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should have check-consistency command registered', () => {
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('check-consistency');
  });

  it('should have correct check-consistency command description', () => {
    const checkCmd = program.commands.find((cmd) => cmd.name() === 'check-consistency');
    expect(checkCmd?.description()).toContain('inconsistencies');
  });

  it('should output JSON format', async () => {
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
    writeFileSync(
      join(testDir, 'arc1', 'ep01', 'ch001.md'),
      `---
arc: arc1
episode: 1
chapter: 1
pov: Alice
title: Test
---
Content
`,
    );

    await program.parseAsync([
      'node',
      'test',
      'check-consistency',
      'arc1',
      '--content',
      testDir,
      '--format',
      'json',
    ]);

    const jsonCall = mockLog.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('"arc"'),
    );
    expect(jsonCall).toBeDefined();
  });

  it('should show no issues message', async () => {
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
    writeFileSync(
      join(testDir, 'arc1', 'ep01', 'ch001.md'),
      `---
arc: arc1
episode: 1
chapter: 1
pov: Alice
title: Test
---
Content
`,
    );

    await program.parseAsync(['node', 'test', 'check-consistency', 'arc1', '--content', testDir]);

    expect(mockLog).toHaveBeenCalledWith('✅ No issues found!');
  });

  it('should show issues with details', async () => {
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
    writeFileSync(
      join(testDir, 'arc1', 'ep01', 'ch001.md'),
      `---
arc: arc1
episode: 1
chapter: 1
pov: Alice
title: Test
kink: "primo-plug"
---
Content
`,
    );
    writeFileSync(
      join(testDir, 'arc1', 'ep01', 'ch002.md'),
      `---
arc: arc1
episode: 1
chapter: 2
pov: Alice
title: Test 2
kink: "primo-plug"
---
More content
`,
    );

    await program.parseAsync(['node', 'test', 'check-consistency', 'arc1', '--content', testDir]);

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('🔍 Consistency check'));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Found 1 issue(s)'));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Summary:'));
  });

  it('should handle rules parameter', async () => {
    mkdirSync(join(testDir, 'arc1', 'ep01'), { recursive: true });
    writeFileSync(
      join(testDir, 'arc1', 'ep01', 'ch001.md'),
      `---
arc: arc1
episode: 1
chapter: 1
pov: Alice
title: Test
---
Content
`,
    );

    await program.parseAsync([
      'node',
      'test',
      'check-consistency',
      'arc1',
      '--content',
      testDir,
      '--rules',
      'kink-firsts',
    ]);

    expect(mockLog).toHaveBeenCalledWith('✅ No issues found!');
  });

  it('should handle errors', async () => {
    await program.parseAsync([
      'node',
      'test',
      'check-consistency',
      'nonexistent',
      '--content',
      '/nonexistent',
    ]);

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('❌ Error:'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
