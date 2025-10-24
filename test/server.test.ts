import { Tracker } from '@echoes-io/tracker';
import { describe, expect, it } from 'vitest';

import { createServer } from '../lib/server.js';

describe('MCP Server', () => {
  it('should create server instance', async () => {
    const tracker = new Tracker(':memory:');
    await tracker.init();
    const server = createServer(tracker);
    expect(server).toBeDefined();
    await tracker.close();
  });
});
