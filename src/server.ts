import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { indexRag, indexRagSchema } from './tools/index-rag.js';
import { indexTracker, indexTrackerSchema } from './tools/index-tracker.js';
import { ragContext, ragContextSchema } from './tools/rag-context.js';
import { ragSearch, ragSearchSchema } from './tools/rag-search.js';
import { wordsCount, wordsCountSchema } from './tools/words-count.js';

const server = new Server(
  {
    name: 'echoes-mcp-server',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'words-count',
        description: 'Count words and text statistics in markdown files',
        inputSchema: wordsCountSchema,
      },
      {
        name: 'index-tracker',
        description: 'Synchronize filesystem content with database',
        inputSchema: indexTrackerSchema,
      },
      {
        name: 'index-rag',
        description: 'Index chapters into GraphRAG for semantic search',
        inputSchema: indexRagSchema,
      },
      {
        name: 'rag-search',
        description: 'Search chapters using semantic similarity and character filtering',
        inputSchema: ragSearchSchema,
      },
      {
        name: 'rag-context',
        description: 'Retrieve full chapter content for AI context using semantic search',
        inputSchema: ragContextSchema,
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'words-count':
      try {
        const result = await wordsCount(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    case 'index-tracker':
      try {
        const result = await indexTracker(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    case 'index-rag':
      try {
        const result = await indexRag(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    case 'rag-search':
      try {
        const result = await ragSearch(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    case 'rag-context':
      try {
        const result = await ragContext(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Echoes MCP Server running on stdio');
}

export { server };
