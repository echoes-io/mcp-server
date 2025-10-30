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

export function createServer(tracker: Tracker, rag: RAGSystem) {
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
          name: 'book-generate',
          description: 'Generate PDF book from timeline content using LaTeX',
          inputSchema: zodToJsonSchema(bookGenerateSchema),
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
      case 'chapter-delete':
        return await chapterDelete(chapterDeleteSchema.parse(args), tracker);
      case 'chapter-insert':
        return await chapterInsert(chapterInsertSchema.parse(args), tracker);
      case 'episode-info':
        return await episodeInfo(episodeInfoSchema.parse(args), tracker);
      case 'episode-update':
        return await episodeUpdate(episodeUpdateSchema.parse(args), tracker);
      case 'timeline-sync':
        return await timelineSync(timelineSyncSchema.parse(args), tracker);
      case 'stats':
        return await stats(statsSchema.parse(args), tracker);
      case 'rag-index':
        return await ragIndex(ragIndexSchema.parse(args), tracker, rag);
      case 'rag-search':
        return await ragSearch(ragSearchSchema.parse(args), rag);
      case 'rag-context':
        return await ragContext(ragContextSchema.parse(args), rag);
      case 'book-generate':
        return await bookGenerate(bookGenerateSchema.parse(args));
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

  // Initialize RAG system
  const ragDbPath =
    process.env.ECHOES_RAG_DB_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : './rag.db');
  const provider = (process.env.ECHOES_RAG_PROVIDER || 'e5-small') as
    | 'e5-small'
    | 'e5-large'
    | 'gemini';
  const rag = new RAGSystem({
    provider,
    dbPath: ragDbPath,
    geminiApiKey: process.env.ECHOES_GEMINI_API_KEY,
  });
  console.error(`RAG system initialized: ${ragDbPath} (provider: ${provider})`);

  const server = createServer(tracker, rag);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Echoes MCP Server running on stdio');
}
