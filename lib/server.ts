import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getPrompt, PROMPTS } from './prompts/index.js';
import { graphExport, graphExportConfig, graphExportSchema } from './tools/graph-export.js';
import { history, historyConfig, historySchema } from './tools/history.js';
import { index, indexConfig, indexSchema } from './tools/index.js';
import { list, listConfig, listSchema } from './tools/list.js';
import {
  reviewGenerate,
  reviewGenerateConfig,
  reviewGenerateSchema,
} from './tools/review-generate.js';
import { reviewStatus, reviewStatusConfig, reviewStatusSchema } from './tools/review-status.js';
import { search, searchConfig, searchSchema } from './tools/search.js';
import { stats, statsConfig, statsSchema } from './tools/stats.js';
import { wordsCount, wordsCountConfig, wordsCountSchema } from './tools/words-count.js';
import { getPackageConfig } from './utils.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function success(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function formatError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

export function createServer(): McpServer {
  const { description, name, version } = getPackageConfig();

  const server = new McpServer({ name, description, version });

  // Register tools
  server.registerTool(
    wordsCountConfig.name,
    {
      description: wordsCountConfig.description,
      inputSchema: wordsCountSchema,
    },
    async (args) => {
      try {
        return success(wordsCount(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    statsConfig.name,
    {
      description: statsConfig.description,
      inputSchema: statsSchema,
    },
    async (args) => {
      try {
        return success(await stats(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    indexConfig.name,
    {
      description: indexConfig.description,
      inputSchema: indexSchema,
    },
    async (args) => {
      try {
        return success(await index(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    searchConfig.name,
    {
      description: searchConfig.description,
      inputSchema: searchSchema,
      /* v8 ignore start */
    },
    async (args) => {
      try {
        return success(await search(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    listConfig.name,
    {
      description: listConfig.description,
      inputSchema: listSchema,
    },
    async (args) => {
      try {
        return success(await list(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    graphExportConfig.name,
    {
      description: graphExportConfig.description,
      inputSchema: graphExportSchema,
    },
    async (args) => {
      try {
        return success(await graphExport(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    historyConfig.name,
    {
      description: historyConfig.description,
      inputSchema: historySchema,
    },
    async (args) => {
      try {
        return success(await history(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    reviewGenerateConfig.name,
    {
      description: reviewGenerateConfig.description,
      inputSchema: reviewGenerateSchema,
    },
    async (args) => {
      try {
        return success(await reviewGenerate(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    reviewStatusConfig.name,
    {
      description: reviewStatusConfig.description,
      inputSchema: reviewStatusSchema,
    },
    async (args) => {
      try {
        return success(await reviewStatus(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );
  /* v8 ignore stop */

  // Register prompts
  for (const prompt of PROMPTS) {
    server.prompt(prompt.name, prompt.description, prompt.args, (args) => {
      try {
        const text = getPrompt(prompt.name, args as Record<string, string>);
        return { messages: [{ role: 'user', content: { type: 'text', text } }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : /* v8 ignore next */ String(err);
        return {
          messages: [{ role: 'user', content: { type: 'text', text: `Error: ${message}` } }],
        };
      }
    });
  }

  return server;
}

/* v8 ignore start */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
/* v8 ignore stop */
