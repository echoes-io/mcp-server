import { join } from 'node:path';

import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it, vi } from 'vitest';

import { createServer, runServer } from '../lib/server.js';

describe('MCP Server', () => {
  it('should create server instance', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);
    expect(server).toBeDefined();
    await tracker.close();
  });

  it('should run server with mocked transport', async () => {
    // Mock console.error to avoid noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock StdioServerTransport
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
      })),
    }));

    // Set test environment
    process.env.NODE_ENV = 'test';

    // Import and run server after mocking
    const { runServer: mockedRunServer } = await import('../lib/server.js');
    await mockedRunServer();

    expect(consoleSpy).toHaveBeenCalledWith('Tracker database initialized: :memory:');
    expect(consoleSpy).toHaveBeenCalledWith('Echoes MCP Server running on stdio');

    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should handle words-count tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    // Mock the handler directly
    const handler = server['_requestHandlers'].get('tools/call');
    expect(handler).toBeDefined();

    const testFile = join(process.cwd(), 'test/example.md');
    const result = await handler({
      method: 'tools/call',
      params: {
        name: 'words-count',
        arguments: { file: testFile },
      },
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    await tracker.close();
  });

  it('should handle chapter-info tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'chapter-info',
          arguments: { timeline: 'test', arc: 'test', episode: 1, chapter: 1 },
        },
      }),
    ).rejects.toThrow('Chapter not found');

    await tracker.close();
  });

  it('should handle episode-info tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'episode-info',
          arguments: { timeline: 'test', arc: 'test', episode: 1 },
        },
      }),
    ).rejects.toThrow('Episode not found');

    await tracker.close();
  });

  it('should handle timeline-sync tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/call');
    const contentPath = join(process.cwd(), 'test/content');

    const result = await handler({
      method: 'tools/call',
      params: {
        name: 'timeline-sync',
        arguments: { timeline: 'test-timeline', contentPath },
      },
    });

    expect(result.content).toHaveLength(1);
    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('test-timeline');

    await tracker.close();
  });

  it('should handle unknown tool', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {},
        },
      }),
    ).rejects.toThrow('Unknown tool: unknown-tool');

    await tracker.close();
  });

  it('should handle tools/list', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/list');
    const result = await handler({
      method: 'tools/list',
      params: {},
    });

    expect(result.tools).toHaveLength(4);
    expect(result.tools.map((t) => t.name)).toEqual([
      'words-count',
      'chapter-info',
      'episode-info',
      'timeline-sync',
    ]);

    await tracker.close();
  });

  it('should handle invalid tool arguments', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);

    const handler = server['_requestHandlers'].get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'words-count',
          arguments: {}, // missing file
        },
      }),
    ).rejects.toThrow();

    await tracker.close();
  });
});
