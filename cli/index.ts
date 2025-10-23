#!/usr/bin/env node

import { runServer } from '../lib/server.js';

runServer().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
