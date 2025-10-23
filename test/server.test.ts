import { describe, expect, it } from 'vitest';

import { createServer } from '../lib/server.js';

describe('MCP Server', () => {
  it('should create server instance', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
