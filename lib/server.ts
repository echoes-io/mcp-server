import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAGSystem } from '@echoes-io/rag';
import { Tracker } from '@echoes-io/tracker';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  bookGenerate,
  bookGenerateSchema,
  chapterDelete,
  chapterDeleteSchema,
  chapterInfo,
  chapterInfoSchema,
  chapterInsert,
  chapterInsertSchema,
  chapterRefresh,
  chapterRefreshSchema,
  episodeInfo,
  episodeInfoSchema,
  episodeUpdate,
  episodeUpdateSchema,
  ragCharacters,
  ragCharactersSchema,
  ragContext,
  ragContextSchema,
  ragIndex,
  ragIndexSchema,
  ragSearch,
  ragSearchSchema,
  stats,
  statsSchema,
  timelineSync,
  timelineSyncSchema,
  wordsCount,
  wordsCountSchema,
} from './tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

interface TimelineContext {
  tracker: Tracker;
  rag: RAGSystem;
  contentPath: string;
}

export function createServer(timelines: Map<string, TimelineContext>) {
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
          inputSchema: toJsonSchemaCompat(wordsCountSchema),
        },
        {
          name: 'chapter-info',
          description: 'Extract chapter metadata, content preview, and statistics',
          inputSchema: toJsonSchemaCompat(chapterInfoSchema),
        },
        {
          name: 'episode-info',
          description: 'Get episode information and list of chapters',
          inputSchema: toJsonSchemaCompat(episodeInfoSchema),
        },
        {
          name: 'episode-update',
          description: 'Update episode metadata (description, title, slug)',
          inputSchema: toJsonSchemaCompat(episodeUpdateSchema),
        },
        {
          name: 'chapter-refresh',
          description: 'Refresh chapter metadata and statistics from file',
          inputSchema: toJsonSchemaCompat(chapterRefreshSchema),
        },
        {
          name: 'chapter-delete',
          description: 'Delete chapter from database and optionally from filesystem',
          inputSchema: toJsonSchemaCompat(chapterDeleteSchema),
        },
        {
          name: 'chapter-insert',
          description: 'Insert new chapter and automatically renumber subsequent chapters',
          inputSchema: toJsonSchemaCompat(chapterInsertSchema),
        },
        {
          name: 'timeline-sync',
          description: 'Synchronize timeline content with database',
          inputSchema: toJsonSchemaCompat(timelineSyncSchema),
        },
        {
          name: 'stats',
          description: 'Get statistics for timeline, arc, episode, or POV',
          inputSchema: toJsonSchemaCompat(statsSchema),
        },
        {
          name: 'rag-index',
          description: 'Index chapters into RAG vector database for semantic search',
          inputSchema: toJsonSchemaCompat(ragIndexSchema),
        },
        {
          name: 'rag-search',
          description: 'Semantic search across timeline content',
          inputSchema: toJsonSchemaCompat(ragSearchSchema),
        },
        {
          name: 'rag-context',
          description: 'Retrieve relevant context for AI interactions',
          inputSchema: toJsonSchemaCompat(ragContextSchema),
        },
        {
          name: 'rag-characters',
          description: 'Get all characters that appear in chapters with a specific character',
          inputSchema: toJsonSchemaCompat(ragCharactersSchema),
        },
        {
          name: 'book-generate',
          description: 'Generate PDF book from timeline content using LaTeX',
          inputSchema: toJsonSchemaCompat(bookGenerateSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Helper to get timeline context
    const getContext = (timeline: string) => {
      const ctx = timelines.get(timeline);
      if (!ctx) {
        throw new Error(
          `Timeline "${timeline}" not found. Available: ${Array.from(timelines.keys()).join(', ')}`,
        );
      }
      return ctx;
    };

    switch (name) {
      case 'words-count':
        return await wordsCount(wordsCountSchema.parse(args));
      case 'chapter-info': {
        const parsed = chapterInfoSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await chapterInfo(parsed, tracker);
      }
      case 'chapter-refresh': {
        const parsed = chapterRefreshSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await chapterRefresh(parsed, tracker);
      }
      case 'chapter-delete': {
        const parsed = chapterDeleteSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await chapterDelete(parsed, tracker);
      }
      case 'chapter-insert': {
        const parsed = chapterInsertSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await chapterInsert(parsed, tracker);
      }
      case 'episode-info': {
        const parsed = episodeInfoSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await episodeInfo(parsed, tracker);
      }
      case 'episode-update': {
        const parsed = episodeUpdateSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await episodeUpdate(parsed, tracker);
      }
      case 'timeline-sync': {
        const parsed = timelineSyncSchema.parse(args);
        const { tracker, contentPath } = getContext(parsed.timeline);
        return await timelineSync({ ...parsed, contentPath }, tracker);
      }
      case 'stats': {
        const parsed = statsSchema.parse(args);
        const { tracker } = getContext(parsed.timeline);
        return await stats(parsed, tracker);
      }
      case 'rag-index': {
        const parsed = ragIndexSchema.parse(args);
        const { tracker, rag, contentPath } = getContext(parsed.timeline);
        return await ragIndex({ ...parsed, contentPath }, tracker, rag);
      }
      case 'rag-search': {
        const parsed = ragSearchSchema.parse(args);
        const { rag } = getContext(parsed.timeline);
        return await ragSearch(parsed, rag);
      }
      case 'rag-context': {
        const parsed = ragContextSchema.parse(args);
        const { rag } = getContext(parsed.timeline);
        return await ragContext(parsed, rag);
      }
      case 'rag-characters': {
        const parsed = ragCharactersSchema.parse(args);
        const { rag } = getContext(parsed.timeline);
        return await ragCharacters(parsed, rag);
      }
      case 'book-generate': {
        const parsed = bookGenerateSchema.parse(args);
        const { contentPath } = getContext(parsed.timeline);
        return await bookGenerate({ ...parsed, contentPath });
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

interface TimelineContext {
  tracker: Tracker;
  rag: RAGSystem;
  contentPath: string;
}

export async function runServer() {
  const { readdirSync, existsSync } = await import('node:fs');
  const { join, basename } = await import('node:path');

  const cwd = process.cwd();
  const cwdName = basename(cwd);
  const timelines = new Map<string, TimelineContext>();

  console.error(`[DEBUG] Starting from: ${cwd}`);

  if (process.env.NODE_ENV === 'test') {
    // Test mode: in-memory databases
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = new RAGSystem({
      provider: 'e5-small',
      dbPath: ':memory:',
    });
    timelines.set('test', { tracker, rag, contentPath: './test-content' });
    console.error('[DEBUG] Mode: test (in-memory)');
  } else if (cwdName.startsWith('timeline-')) {
    // Single timeline mode: running from timeline directory
    const timelineName = cwdName.replace('timeline-', '');
    const contentPath = join(cwd, 'content');

    if (!existsSync(contentPath)) {
      throw new Error(`No content directory found in ${cwd}`);
    }

    const trackerPath = join(cwd, 'tracker.db');
    const ragPath = join(cwd, 'rag.db');

    const tracker = new Tracker(trackerPath);
    await tracker.init();

    const provider = (process.env.ECHOES_RAG_PROVIDER || 'e5-small') as
      | 'e5-small'
      | 'e5-large'
      | 'gemini';
    const rag = new RAGSystem({
      provider,
      dbPath: ragPath,
      geminiApiKey: process.env.ECHOES_GEMINI_API_KEY,
    });

    timelines.set(timelineName, { tracker, rag, contentPath });
    console.error(`[DEBUG] Mode: single-timeline "${timelineName}"`);
    console.error(`[DEBUG] Content: ${contentPath}`);
    console.error(`[DEBUG] Tracker: ${trackerPath}`);
    console.error(`[DEBUG] RAG: ${ragPath}`);
  } else if (cwdName === 'mcp-server') {
    // Test mode from mcp-server directory: in-memory
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = new RAGSystem({
      provider: 'e5-small',
      dbPath: ':memory:',
    });
    timelines.set('test', { tracker, rag, contentPath: './test-content' });
    console.error('[DEBUG] Mode: test from mcp-server (in-memory)');
  } else {
    // Multi-timeline mode: discover from parent directory (backward compat for .github)
    const parentDir = join(cwd, '..');
    const entries = readdirSync(parentDir, { withFileTypes: true });

    console.error(`[DEBUG] Mode: multi-timeline (scanning ${parentDir})`);

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('timeline-')) {
        const timelineName = entry.name.replace('timeline-', '');
        const timelinePath = join(parentDir, entry.name);
        const contentPath = join(timelinePath, 'content');

        if (!existsSync(contentPath)) {
          console.error(`[DEBUG] Skipping ${entry.name}: no content directory`);
          continue;
        }

        const trackerPath = join(timelinePath, 'tracker.db');
        const ragPath = join(timelinePath, 'rag.db');

        const tracker = new Tracker(trackerPath);
        await tracker.init();

        const provider = (process.env.ECHOES_RAG_PROVIDER || 'e5-small') as
          | 'e5-small'
          | 'e5-large'
          | 'gemini';
        const rag = new RAGSystem({
          provider,
          dbPath: ragPath,
          geminiApiKey: process.env.ECHOES_GEMINI_API_KEY,
        });

        timelines.set(timelineName, { tracker, rag, contentPath });
        console.error(`[DEBUG] Timeline "${timelineName}": ${trackerPath}`);
      }
    }

    if (timelines.size === 0) {
      throw new Error('No timelines found in parent directory');
    }
  }

  const server = createServer(timelines);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[DEBUG] Server ready with ${timelines.size} timeline(s)`);
}
