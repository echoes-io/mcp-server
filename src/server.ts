import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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
