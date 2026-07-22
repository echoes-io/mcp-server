export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export interface GraphQLClient {
  execute<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

/**
 * Creates a thin GraphQL client for AppSync using native fetch.
 * Authenticates via `x-api-key` header.
 */
export function createGraphQLClient(apiUrl: string, apiKey: string): GraphQLClient {
  return {
    async execute<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed (${response.status}). API key may be expired — update PUBLISHER_API_KEY in your .env file.`,
          );
        }
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as GraphQLResponse<T>;

      if (json.errors?.length) {
        const messages = json.errors.map((e) => e.message).join('; ');
        throw new Error(`GraphQL errors: ${messages}`);
      }

      if (!json.data) {
        throw new Error('GraphQL response missing data field');
      }

      return json.data;
    },
  };
}
