#!/usr/bin/env node

import { runServer } from '../src/server.js';
import { wordsCount } from '../src/tools/words-count.js';

const [, , command, ...args] = process.argv;

async function main() {
  if (!command) {
    // No command = run MCP server
    await runServer();
    return;
  }

  // CLI commands
  switch (command) {
    case 'words-count': {
      const filePath = args[0];
      const detailed = args.includes('--detailed');

      if (!filePath) {
        console.error('Usage: echoes-mcp-server words-count <file> [--detailed]');
        process.exit(1);
      }

      try {
        const result = await wordsCount({ filePath, detailed });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'help':
      console.log(`
Echoes MCP Server v3.0.0

Usage:
  echoes-mcp-server                    # Run MCP server
  echoes-mcp-server words-count <file> # Count words in file
  echoes-mcp-server help               # Show this help

Options:
  --detailed                           # Include detailed statistics
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "echoes-mcp-server help" for usage information');
      process.exit(1);
  }
}

main().catch(console.error);
