import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createServer, formatError } from '../lib/server.js';

describe('formatError', () => {
  it('formats Error instances', () => {
    const result = formatError(new Error('test error'));
    expect(result.content[0].text).toBe('Error: test error');
    expect(result.isError).toBe(true);
  });

  it('formats non-Error values', () => {
    const result = formatError('string error');
    expect(result.content[0].text).toBe('Error: string error');
    expect(result.isError).toBe(true);
  });
});

describe('MCP Server', () => {
  let client: Client;

  beforeEach(async () => {
    const server = createServer({
      publisherApiUrl: 'https://test.appsync-api.eu-west-1.amazonaws.com/graphql',
      publisherApiKey: 'da2-test123',
      timeline: 'eros',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
  });

  it('lists all registered tools', async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);

    expect(names).toContain('words-count');
    expect(names).toContain('mage_queue_add');
    expect(names).toContain('mage_queue_add_bulk');
    expect(names).toContain('mage_queue_list');
    expect(names).toContain('mage_queue_pause');
    expect(names).toContain('mage_queue_resume');
    expect(names).toContain('mage_queue_cancel');
    expect(names).toContain('mage_results_list');
    expect(names).toContain('mage_results_save');
    expect(names).toContain('mage_results_save_all');
    expect(names).toContain('mage_commit');
    expect(names).toContain('mage_status');
    expect(names).toContain('mage_characters_list');
    expect(names).toHaveLength(13);
  });

  it('executes words-count tool', async () => {
    const result = await client.callTool({
      name: 'words-count',
      arguments: {
        filePath:
          'test/fixtures/content/bloom/ep01-first-episode/ep01-ch001-alice-the-beginning.md',
      },
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(data.words).toBeGreaterThan(50);
  });

  it('returns error for non-existent file', async () => {
    const result = await client.callTool({
      name: 'words-count',
      arguments: { filePath: '/nonexistent.md' },
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain('Error');
  });

  it('returns error for mage tools when API is unreachable', async () => {
    // Mock fetch to simulate network error
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const result = await client.callTool({
      name: 'mage_queue_list',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain('Error');

    vi.unstubAllGlobals();
  });

  it('lists resources', async () => {
    const resources = await client.listResourceTemplates();
    const uris = resources.resourceTemplates.map((r) => r.uriTemplate);

    expect(uris).toContain('publisher://mage/status');
    expect(uris).toContain('publisher://mage/queue');
    expect(uris).toContain('publisher://mage/results');
    expect(uris).toContain('publisher://mage/characters');
  });
});
