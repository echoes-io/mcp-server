import { join } from 'node:path';

import type { RAGSystem } from '@echoes-io/rag';
import { Tracker } from '@echoes-io/tracker';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createServer } from '../lib/server.js';
import { clearTestTimeline, setTestTimeline } from './helpers.js';

describe('MCP Server', () => {
  beforeEach(() => {
    setTestTimeline();
  });

  afterEach(() => {
    clearTestTimeline();
  });

  it('should create server instance', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const timelines = new Map([['test', { tracker, rag, contentPath: './test-content' }]]);
    const server = createServer(timelines);
    expect(server).toBeDefined();
    await tracker.close();
  });

  it('should handle words-count tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const timelines = new Map([['test', { tracker, rag, contentPath: './test-content' }]]);
    const server = createServer(timelines);

    // Mock the handler directly
    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');
    expect(handler).toBeDefined();

    const testFile = join(process.cwd(), 'test/example.md');
    const result = await handler({
      method: 'tools/call',
      params: {
        name: 'words-count',
        arguments: { timeline: 'test-timeline', file: testFile },
      },
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    await tracker.close();
  });

  it('should handle chapter-info tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

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
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

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

  it('should handle chapter-refresh tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');
    const testFile = join(process.cwd(), 'test/example.md');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'chapter-refresh',
          arguments: { timeline: 'test', file: testFile },
        },
      }),
    ).rejects.toThrow('Chapter not found in database');

    await tracker.close();
  });

  it('should handle chapter-delete tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'chapter-delete',
          arguments: { timeline: 'test', arc: 'test', episode: 1, chapter: 1 },
        },
      }),
    ).rejects.toThrow('Chapter not found');

    await tracker.close();
  });

  it('should handle chapter-insert tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

    await expect(
      handler({
        method: 'tools/call',
        params: {
          name: 'chapter-insert',
          arguments: {
            timeline: 'test',
            arc: 'test',
            episode: 1,
            after: 1,
            pov: 'Alice',
            title: 'New Chapter',
          },
        },
      }),
    ).rejects.toThrow('Episode not found');

    await tracker.close();
  });

  it('should handle timeline-sync tool call', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const contentPath = join(process.cwd(), 'test/content');
    const server = createServer(new Map([['test', { tracker, rag, contentPath }]]));

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

    const result = await handler({
      method: 'tools/call',
      params: {
        name: 'timeline-sync',
        arguments: { timeline: 'test' },
      },
    });

    expect(result.content).toHaveLength(1);
    const info = JSON.parse(result.content[0].text);
    expect(info.timeline).toBe('test');

    await tracker.close();
  });

  it('should handle unknown tool', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

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
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/list');
    const result = await handler({
      method: 'tools/list',
      params: {},
    });

    expect(result.tools).toHaveLength(14);
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual([
      'words-count',
      'chapter-info',
      'episode-info',
      'episode-update',
      'chapter-refresh',
      'chapter-delete',
      'chapter-insert',
      'timeline-sync',
      'stats',
      'rag-index',
      'rag-search',
      'rag-context',
      'rag-characters',
      'book-generate',
    ]);

    await tracker.close();
  });

  it('should handle invalid tool arguments', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = {} as RAGSystem;
    const server = createServer(
      new Map([['test', { tracker, rag, contentPath: './test-content' }]]),
    );

    //@ts-expect-error accessing a private method for testing purposes
    const handler = server._requestHandlers.get('tools/call');

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
