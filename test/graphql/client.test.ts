import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphQLClient } from '../../lib/graphql/client.js';

describe('createGraphQLClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends correct headers and body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { test: 'value' } }),
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'test-key');
    await client.execute('query { test }', { foo: 'bar' });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
      },
      body: JSON.stringify({ query: 'query { test }', variables: { foo: 'bar' } }),
    });
  });

  it('returns data on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { result: 42 } }),
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'key');
    const result = await client.execute<{ result: number }>('query { result }');
    expect(result.result).toBe(42);
  });

  it('throws on 401/403 with helpful message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'bad-key');
    await expect(client.execute('query { test }')).rejects.toThrow('API key may be expired');
  });

  it('throws on other HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'key');
    await expect(client.execute('query { test }')).rejects.toThrow('500 Internal Server Error');
  });

  it('throws on GraphQL errors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: null,
        errors: [{ message: 'Not found' }, { message: 'Invalid input' }],
      }),
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'key');
    await expect(client.execute('query { test }')).rejects.toThrow('Not found; Invalid input');
  });

  it('throws when data is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const client = createGraphQLClient('https://api.example.com/graphql', 'key');
    await expect(client.execute('query { test }')).rejects.toThrow('missing data field');
  });
});
