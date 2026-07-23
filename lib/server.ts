import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { type AppConfig, loadConfig } from './config.js';
import { createGraphQLClient, type GraphQLClient } from './graphql/client.js';
import { GET_MAGE_CONFIG, LIST_MAGE_CHARACTERS, LIST_MAGE_JOBS } from './graphql/queries.js';
import type {
  GetMageConfigResponse,
  ListMageCharactersResponse,
  ListMageJobsResponse,
} from './graphql/types.js';
import {
  mageCharactersList,
  mageCharactersListConfig,
  mageCharactersListSchema,
} from './tools/mage-characters.js';
import { mageCommit, mageCommitConfig, mageCommitSchema } from './tools/mage-commit.js';
import {
  type MageQueueAddBulkInput,
  type MageQueueAddInput,
  type MageQueueCancelInput,
  mageQueueAdd,
  mageQueueAddBulk,
  mageQueueAddBulkConfig,
  mageQueueAddBulkSchema,
  mageQueueAddConfig,
  mageQueueAddSchema,
  mageQueueCancel,
  mageQueueCancelConfig,
  mageQueueCancelSchema,
  mageQueueList,
  mageQueueListConfig,
  mageQueueListSchema,
  mageQueuePause,
  mageQueuePauseConfig,
  mageQueuePauseSchema,
  mageQueueResume,
  mageQueueResumeConfig,
  mageQueueResumeSchema,
} from './tools/mage-queue.js';
import {
  type MageResultsListInput,
  type MageResultsSaveAllInput,
  type MageResultsSaveInput,
  mageResultsList,
  mageResultsListConfig,
  mageResultsListSchema,
  mageResultsSave,
  mageResultsSaveAll,
  mageResultsSaveAllConfig,
  mageResultsSaveAllSchema,
  mageResultsSaveConfig,
  mageResultsSaveSchema,
} from './tools/mage-results.js';
import { mageStatus, mageStatusConfig, mageStatusSchema } from './tools/mage-status.js';
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

export function createServer(config: AppConfig): McpServer {
  const { description, name, version } = getPackageConfig();
  const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);

  const server = new McpServer({ name, description, version });

  registerTools(server, client);
  registerResources(server, client);

  return server;
}

function registerTools(server: McpServer, client: GraphQLClient): void {
  // --- Content tools ---

  server.registerTool(
    wordsCountConfig.name,
    { description: wordsCountConfig.description, inputSchema: wordsCountSchema },
    async (args) => {
      try {
        return success(wordsCount(args));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // --- Mage Queue tools ---

  server.registerTool(
    mageQueueAddConfig.name,
    { description: mageQueueAddConfig.description, inputSchema: mageQueueAddSchema },
    async (args) => {
      try {
        return success(await mageQueueAdd(args as MageQueueAddInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageQueueAddBulkConfig.name,
    { description: mageQueueAddBulkConfig.description, inputSchema: mageQueueAddBulkSchema },
    async (args) => {
      try {
        return success(await mageQueueAddBulk(args as MageQueueAddBulkInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageQueueListConfig.name,
    { description: mageQueueListConfig.description, inputSchema: mageQueueListSchema },
    async () => {
      try {
        return success(await mageQueueList(client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageQueuePauseConfig.name,
    { description: mageQueuePauseConfig.description, inputSchema: mageQueuePauseSchema },
    async () => {
      try {
        return success(await mageQueuePause(client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageQueueResumeConfig.name,
    { description: mageQueueResumeConfig.description, inputSchema: mageQueueResumeSchema },
    async () => {
      try {
        return success(await mageQueueResume(client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageQueueCancelConfig.name,
    { description: mageQueueCancelConfig.description, inputSchema: mageQueueCancelSchema },
    async (args) => {
      try {
        return success(await mageQueueCancel(args as MageQueueCancelInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // --- Mage Results tools ---

  server.registerTool(
    mageResultsListConfig.name,
    { description: mageResultsListConfig.description, inputSchema: mageResultsListSchema },
    async (args) => {
      try {
        return success(await mageResultsList(args as MageResultsListInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageResultsSaveConfig.name,
    { description: mageResultsSaveConfig.description, inputSchema: mageResultsSaveSchema },
    async (args) => {
      try {
        return success(await mageResultsSave(args as MageResultsSaveInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  server.registerTool(
    mageResultsSaveAllConfig.name,
    { description: mageResultsSaveAllConfig.description, inputSchema: mageResultsSaveAllSchema },
    async (args) => {
      try {
        return success(await mageResultsSaveAll(args as MageResultsSaveAllInput, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // --- Mage Commit tool ---

  server.registerTool(
    mageCommitConfig.name,
    { description: mageCommitConfig.description, inputSchema: mageCommitSchema },
    async (args) => {
      try {
        return success(await mageCommit(args as { message?: string }, client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // --- Mage Status tool ---

  server.registerTool(
    mageStatusConfig.name,
    { description: mageStatusConfig.description, inputSchema: mageStatusSchema },
    async () => {
      try {
        return success(await mageStatus(client));
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // --- Mage Characters tool ---

  server.registerTool(
    mageCharactersListConfig.name,
    { description: mageCharactersListConfig.description, inputSchema: mageCharactersListSchema },
    async () => {
      try {
        return success(await mageCharactersList(client));
      } catch (err) {
        return formatError(err);
      }
    },
  );
}

function registerResources(server: McpServer, client: GraphQLClient): void {
  server.resource(
    'mage-status',
    new ResourceTemplate('publisher://mage/status', { list: undefined }),
    async () => {
      const [configRes, jobsRes] = await Promise.all([
        client.execute<GetMageConfigResponse>(GET_MAGE_CONFIG),
        client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'COMPLETE' }),
      ]);
      const data = {
        config: configRes.getMageConfig,
        completedJobs: jobsRes.listMageJobs.items.length,
      };
      return {
        contents: [{ uri: 'publisher://mage/status', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.resource(
    'mage-queue',
    new ResourceTemplate('publisher://mage/queue', { list: undefined }),
    async () => {
      const [queued, processing] = await Promise.all([
        client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'QUEUED' }),
        client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'PROCESSING' }),
      ]);
      const data = {
        queued: queued.listMageJobs.items,
        processing: processing.listMageJobs.items,
      };
      return {
        contents: [{ uri: 'publisher://mage/queue', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.resource(
    'mage-results',
    new ResourceTemplate('publisher://mage/results', { list: undefined }),
    async () => {
      const response = await client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, {
        status: 'COMPLETE',
        limit: 20,
      });
      const data = { results: response.listMageJobs.items };
      return {
        contents: [{ uri: 'publisher://mage/results', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.resource(
    'mage-characters',
    new ResourceTemplate('publisher://mage/characters', { list: undefined }),
    async () => {
      const response = await client.execute<ListMageCharactersResponse>(LIST_MAGE_CHARACTERS);
      const data = { characters: response.listMageCharacters };
      return {
        contents: [{ uri: 'publisher://mage/characters', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}

/* v8 ignore start */
export async function startServer(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
/* v8 ignore stop */
