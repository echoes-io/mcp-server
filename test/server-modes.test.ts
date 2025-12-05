import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runServer } from '../lib/server.js';

describe('Server Execution Modes', () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env.NODE_ENV;
  const testDir = join(originalCwd, 'test-modes');

  beforeEach(() => {
    // Create test directory structure
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env.NODE_ENV = originalEnv;
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should run in single-timeline mode from timeline-* directory', async () => {
    const timelineDir = join(testDir, 'timeline-pulse');
    const contentDir = join(timelineDir, 'content');
    mkdirSync(contentDir, { recursive: true });

    process.chdir(timelineDir);
    delete process.env.NODE_ENV;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connectSpy = vi.fn();

    vi.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: class {
        connect = connectSpy;
      },
    }));

    await runServer();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Mode: single-timeline "pulse"'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Content: ${contentDir}`));
  });

  it('should run in test mode from mcp-server directory', async () => {
    const mcpServerDir = join(testDir, 'mcp-server');
    mkdirSync(mcpServerDir, { recursive: true });

    process.chdir(mcpServerDir);
    delete process.env.NODE_ENV;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connectSpy = vi.fn();

    vi.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: class {
        connect = connectSpy;
      },
    }));

    await runServer();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Mode: test from mcp-server (in-memory)'),
    );
  });

  it('should run in multi-timeline mode from .github directory', async () => {
    const githubDir = join(testDir, '.github');
    const timeline1 = join(testDir, 'timeline-eros');
    const timeline2 = join(testDir, 'timeline-bloom');

    mkdirSync(githubDir, { recursive: true });
    mkdirSync(join(timeline1, 'content'), { recursive: true });
    mkdirSync(join(timeline2, 'content'), { recursive: true });

    process.chdir(githubDir);
    delete process.env.NODE_ENV;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connectSpy = vi.fn();

    vi.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: class {
        connect = connectSpy;
      },
    }));

    await runServer();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Mode: multi-timeline'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Timeline "eros"'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Timeline "bloom"'));
  });

  it('should skip timelines without content directory', async () => {
    const githubDir = join(testDir, '.github');
    const validTimeline = join(testDir, 'timeline-valid');
    const invalidTimeline = join(testDir, 'timeline-invalid');

    mkdirSync(githubDir, { recursive: true });
    mkdirSync(join(validTimeline, 'content'), { recursive: true });
    mkdirSync(invalidTimeline, { recursive: true }); // No content dir

    process.chdir(githubDir);
    delete process.env.NODE_ENV;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connectSpy = vi.fn();

    vi.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: class {
        connect = connectSpy;
      },
    }));

    await runServer();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Skipping timeline-invalid'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Timeline "valid"'));
  });

  it('should throw error when no content directory in single-timeline mode', async () => {
    const timelineDir = join(testDir, 'timeline-empty');
    mkdirSync(timelineDir, { recursive: true });

    process.chdir(timelineDir);
    delete process.env.NODE_ENV;

    await expect(runServer()).rejects.toThrow('No content directory found');
  });

  it('should throw error when no timelines found in multi-timeline mode', async () => {
    const githubDir = join(testDir, '.github');
    mkdirSync(githubDir, { recursive: true });

    process.chdir(githubDir);
    delete process.env.NODE_ENV;

    await expect(runServer()).rejects.toThrow('No timelines found in parent directory');
  });
});
