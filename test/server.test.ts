import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type MCPContent = Array<{ type: string; text: string }>;

// Mock embeddings and extractor for faster tests
vi.mock('../lib/indexer/embeddings.js', () => ({
  getEmbeddingModel: vi.fn(() => 'test/model'),
  getEmbeddingDtype: vi.fn(() => 'fp32'),
  getEmbeddingDimension: vi.fn(() => Promise.resolve(384)),
  generateEmbedding: vi.fn(() => Promise.resolve(Array(384).fill(0.1))),
  preloadModel: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/indexer/extractor.js', () => ({
  extractEntities: vi.fn(() => Promise.resolve({ entities: [], relations: [] })),
}));

import { createServer, formatError, startServer } from '../lib/server.js';

describe('MCP Server', () => {
  let client: Client;
  let tempDir: string;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-mcp-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('lists available tools', async () => {
    const tools = await client.listTools();

    expect(tools.tools.map((t) => t.name)).toContain('words-count');
    expect(tools.tools.map((t) => t.name)).toContain('stats');
    expect(tools.tools.map((t) => t.name)).toContain('index');
    expect(tools.tools.map((t) => t.name)).toContain('search');
  });

  it('lists available prompts', async () => {
    const prompts = await client.listPrompts();

    expect(prompts.prompts.map((p) => p.name)).toContain('new-chapter');
    expect(prompts.prompts.map((p) => p.name)).toContain('revise-chapter');
    expect(prompts.prompts.map((p) => p.name)).toContain('expand-chapter');
    expect(prompts.prompts.map((p) => p.name)).toContain('new-character');
    expect(prompts.prompts.map((p) => p.name)).toContain('new-episode');
    expect(prompts.prompts.map((p) => p.name)).toContain('new-arc');
    expect(prompts.prompts.map((p) => p.name)).toContain('revise-arc');
  });

  it('returns error when getting prompt without .github repo', async () => {
    const result = await client.getPrompt({
      name: 'new-chapter',
      arguments: { arc: 'bloom', chapter: '1' },
    });

    expect(result.messages[0].content).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Error:'),
    });
  });

  it('executes words-count tool', async () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, 'One two three four five.');

    const result = await client.callTool({
      name: 'words-count',
      arguments: { filePath },
    });

    expect((result.content as MCPContent).length).toBe(1);
    const text = (result.content as MCPContent)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.words).toBe(5);
  });

  it('executes index tool', async () => {
    const contentDir = join(tempDir, 'content', 'bloom', 'ep01');
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(
      join(contentDir, 'ch001.md'),
      '---\narc: bloom\nepisode: 1\nchapter: 1\npov: Alice\ntitle: Test\n---\nContent.',
    );

    const result = await client.callTool({
      name: 'index',
      arguments: { contentPath: join(tempDir, 'content'), dbPath: join(tempDir, 'db') },
    });

    const text = (result.content as MCPContent)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.indexed).toBe(1);
  });

  it('executes stats tool', async () => {
    // First index some content
    const contentDir = join(tempDir, 'content', 'bloom', 'ep01');
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(
      join(contentDir, 'ch001.md'),
      '---\narc: bloom\nepisode: 1\nchapter: 1\npov: Alice\ntitle: Test\n---\nContent here.',
    );
    await client.callTool({
      name: 'index',
      arguments: { contentPath: join(tempDir, 'content'), dbPath: join(tempDir, 'db') },
    });

    const result = await client.callTool({
      name: 'stats',
      arguments: { dbPath: join(tempDir, 'db') },
    });

    const text = (result.content as MCPContent)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.totalChapters).toBe(1);
  });

  it('executes search tool', async () => {
    // First index some content
    const contentDir = join(tempDir, 'content', 'bloom', 'ep01');
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(
      join(contentDir, 'ch001.md'),
      '---\narc: bloom\nepisode: 1\nchapter: 1\npov: Alice\ntitle: Test\n---\nContent about airports.',
    );
    await client.callTool({
      name: 'index',
      arguments: { contentPath: join(tempDir, 'content'), dbPath: join(tempDir, 'db') },
    });

    const result = await client.callTool({
      name: 'search',
      arguments: { query: 'airport', dbPath: join(tempDir, 'db') },
    });

    const text = (result.content as MCPContent)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.type).toBe('chapters');
  });

  it('returns isError on tool failure', async () => {
    const result = await client.callTool({
      name: 'words-count',
      arguments: { filePath: '/nonexistent/file.md' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as MCPContent)[0].text;
    expect(text).toContain('Error:');
  });

  it('returns isError on stats failure', async () => {
    const result = await client.callTool({
      name: 'stats',
      arguments: { dbPath: join(tempDir, 'empty-db') },
    });

    expect(result.isError).toBe(true);
  });

  it('returns isError on index failure', async () => {
    const result = await client.callTool({
      name: 'index',
      arguments: { contentPath: '/nonexistent/path', dbPath: join(tempDir, 'db') },
    });

    expect(result.isError).toBe(true);
  });
});

describe('startServer', () => {
  it('is exported', () => {
    expect(typeof startServer).toBe('function');
  });
});

describe('formatError', () => {
  it('formats Error objects', () => {
    const result = formatError(new Error('test error'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: test error');
  });

  it('formats non-Error values', () => {
    const result = formatError('string error');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: string error');
  });
});
