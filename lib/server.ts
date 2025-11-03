import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAGSystem } from '@echoes-io/rag';
import { Tracker } from '@echoes-io/tracker';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
          name: 'episode-update',
          description: 'Update episode metadata (description, title, slug)',
          inputSchema: zodToJsonSchema(episodeUpdateSchema),
        },
        {
          name: 'chapter-refresh',
          description: 'Refresh chapter metadata and statistics from file',
          inputSchema: zodToJsonSchema(chapterRefreshSchema),
        },
        {
          name: 'chapter-delete',
          description: 'Delete chapter from database and optionally from filesystem',
          inputSchema: zodToJsonSchema(chapterDeleteSchema),
        },
        {
          name: 'chapter-insert',
          description: 'Insert new chapter and automatically renumber subsequent chapters',
          inputSchema: zodToJsonSchema(chapterInsertSchema),
        },
        {
          name: 'timeline-sync',
          description: 'Synchronize timeline content with database',
          inputSchema: zodToJsonSchema(timelineSyncSchema),
        },
        {
          name: 'stats',
          description: 'Get statistics for timeline, arc, episode, or POV',
          inputSchema: zodToJsonSchema(statsSchema),
        },
        {
          name: 'rag-index',
          description: 'Index chapters into RAG vector database for semantic search',
          inputSchema: zodToJsonSchema(ragIndexSchema),
        },
        {
          name: 'rag-search',
          description: 'Semantic search across timeline content',
          inputSchema: zodToJsonSchema(ragSearchSchema),
        },
        {
          name: 'rag-context',
          description: 'Retrieve relevant context for AI interactions',
          inputSchema: zodToJsonSchema(ragContextSchema),
        },
        {
          name: 'rag-characters',
          description: 'Get all characters that appear in chapters with a specific character',
          inputSchema: zodToJsonSchema(ragCharactersSchema),
        },
        {
          name: 'book-generate',
          description: 'Generate PDF book from timeline content using LaTeX',
          inputSchema: zodToJsonSchema(bookGenerateSchema),
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
  // Validate we're running from .github directory
  if (process.env.NODE_ENV !== 'test' && !process.cwd().endsWith('/.github')) {
    throw new Error('Server must be run from .github directory');
  }

  const timelines = new Map<string, TimelineContext>();

  if (process.env.NODE_ENV === 'test') {
    // Test mode: single in-memory database
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const rag = new RAGSystem({
      provider: 'e5-small',
      dbPath: ':memory:',
    });
    timelines.set('test', { tracker, rag, contentPath: './test-content' });
    console.error('Test mode: in-memory databases');
  } else {
    // Production: discover timelines and create separate databases
    const { readdirSync, existsSync, mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');

    const parentDir = join(process.cwd(), '..');
    const entries = readdirSync(parentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('timeline-')) {
        const timelineName = entry.name.replace('timeline-', '');
        const timelinePath = join(parentDir, entry.name);
        const contentPath = join(timelinePath, 'content');

        if (!existsSync(contentPath)) {
          console.error(`Skipping ${entry.name}: no content directory`);
          continue;
        }

        // Initialize tracker
        const trackerPath = join(timelinePath, 'tracker.db');
        const tracker = new Tracker(trackerPath);
        await tracker.init();

        // Initialize RAG
        const ragPath = join(timelinePath, 'rag.db');
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
        console.error(`Timeline "${timelineName}" initialized: ${trackerPath}`);
      }
    }

    if (timelines.size === 0) {
      throw new Error('No timelines found in parent directory');
    }
  }

  const server = createServer(timelines);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Echoes MCP Server running on stdio (${timelines.size} timelines)`);
}
