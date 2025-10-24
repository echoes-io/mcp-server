import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Tracker } from '@echoes-io/tracker';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  chapterInfo,
  chapterInfoSchema,
  chapterRefresh,
  chapterRefreshSchema,
  episodeInfo,
  episodeInfoSchema,
  timelineSync,
  timelineSyncSchema,
  wordsCount,
  wordsCountSchema,
} from './tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

export function createServer(tracker: Tracker) {
  const server = new Server(
    {
      name: pkg.name,
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'words-count',
          description: 'Count words and text statistics in a markdown file',
          inputSchema: zodToJsonSchema(wordsCountSchema),
        },
        {
          name: 'chapter-info',
          description: 'Extract chapter metadata, content preview, and statistics',
          inputSchema: zodToJsonSchema(chapterInfoSchema),
        },
        {
          name: 'episode-info',
          description: 'Get episode information and list of chapters',
          inputSchema: zodToJsonSchema(episodeInfoSchema),
        },
        {
          name: 'chapter-refresh',
          description: 'Refresh chapter metadata and statistics from file',
          inputSchema: zodToJsonSchema(chapterRefreshSchema),
        },
        {
          name: 'timeline-sync',
          description: 'Synchronize timeline content with database',
          inputSchema: zodToJsonSchema(timelineSyncSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'words-count':
        return await wordsCount(wordsCountSchema.parse(args));
      case 'chapter-info':
        return await chapterInfo(chapterInfoSchema.parse(args), tracker);
      case 'chapter-refresh':
        return await chapterRefresh(chapterRefreshSchema.parse(args), tracker);
      case 'episode-info':
        return await episodeInfo(episodeInfoSchema.parse(args), tracker);
      case 'timeline-sync':
        return await timelineSync(timelineSyncSchema.parse(args), tracker);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function runServer() {
  // Initialize tracker database in appropriate location
  const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : './tracker.db';
  const tracker = new Tracker(dbPath);
  await tracker.init();
  console.error(`Tracker database initialized: ${dbPath}`);

  const server = createServer(tracker);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Echoes MCP Server running on stdio');
}
