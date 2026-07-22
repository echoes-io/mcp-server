import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { program } from '../cli/program.js';

describe('CLI', () => {
  it('has correct program metadata', () => {
    expect(program.name()).toBe('@echoes-io/mcp-server');
    expect(program.version()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('has expected commands', () => {
    const commands = program.commands.map((c) => c.name());
    expect(commands).toContain('words-count');
    expect(commands).toContain('serve');
    expect(commands).toContain('mage');
  });

  describe('words-count', () => {
    const fixturePath = join(
      import.meta.dirname,
      'fixtures/content/bloom/ep01-first-episode/ep01-ch001-alice-the-beginning.md',
    );

    it('counts words in a file', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await program.parseAsync(['node', 'test', 'words-count', fixturePath]);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Words'));
      spy.mockRestore();
    });

    it('supports --detailed flag', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await program.parseAsync(['node', 'test', 'words-count', '-d', fixturePath]);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Sentences'));
      spy.mockRestore();
    });

    it('supports multiple files', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await program.parseAsync(['node', 'test', 'words-count', fixturePath, fixturePath]);
      // Check that output was produced for both files
      const calls = spy.mock.calls.filter((c) => String(c[0]).includes('Words'));
      expect(calls.length).toBe(2);
      spy.mockRestore();
    });

    it('handles non-existent file', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      await program.parseAsync(['node', 'test', 'words-count', '/nonexistent.md']);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Error'));
      spy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('mage subcommands', () => {
    it('has mage subcommands', () => {
      const mageCmd = program.commands.find((c) => c.name() === 'mage');
      expect(mageCmd).toBeDefined();

      const subcommands = mageCmd!.commands.map((c) => c.name());
      expect(subcommands).toContain('status');
      expect(subcommands).toContain('characters');
      expect(subcommands).toContain('queue');
      expect(subcommands).toContain('results');
      expect(subcommands).toContain('commit');
    });

    it('has queue subcommands', () => {
      const mageCmd = program.commands.find((c) => c.name() === 'mage');
      const queueCmd = mageCmd!.commands.find((c) => c.name() === 'queue');
      expect(queueCmd).toBeDefined();

      const subcommands = queueCmd!.commands.map((c) => c.name());
      expect(subcommands).toContain('add');
      expect(subcommands).toContain('add-bulk');
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('pause');
      expect(subcommands).toContain('resume');
      expect(subcommands).toContain('cancel');
    });

    it('has results subcommands', () => {
      const mageCmd = program.commands.find((c) => c.name() === 'mage');
      const resultsCmd = mageCmd!.commands.find((c) => c.name() === 'results');
      expect(resultsCmd).toBeDefined();

      const subcommands = resultsCmd!.commands.map((c) => c.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('save');
      expect(subcommands).toContain('save-all');
    });
  });
});
