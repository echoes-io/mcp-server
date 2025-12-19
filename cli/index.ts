#!/usr/bin/env node

import { runServer } from '../src/server.js';
import { indexRag } from '../src/tools/index-rag.js';
import { indexTracker } from '../src/tools/index-tracker.js';
import { ragContext } from '../src/tools/rag-context.js';
import { ragSearch } from '../src/tools/rag-search.js';
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

    case 'index-tracker': {
      const timeline = args[0];
      const contentPath = args[1];

      if (!timeline || !contentPath) {
        console.error('Usage: echoes-mcp-server index-tracker <timeline> <content-path>');
        process.exit(1);
      }

      try {
        const result = await indexTracker({ timeline, contentPath });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'index-rag': {
      const timeline = args[0];
      const contentPath = args[1];
      const arcFlag = args.indexOf('--arc');
      const episodeFlag = args.indexOf('--episode');

      if (!timeline || !contentPath) {
        console.error(
          'Usage: echoes-mcp-server index-rag <timeline> <content-path> [--arc <name>] [--episode <num>]',
        );
        process.exit(1);
      }

      const arc = arcFlag !== -1 ? args[arcFlag + 1] : undefined;
      const episode = episodeFlag !== -1 ? parseInt(args[episodeFlag + 1], 10) : undefined;

      try {
        const result = await indexRag({ timeline, contentPath, arc, episode });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'rag-search': {
      const timeline = args[0];
      const query = args[1];

      if (!timeline || !query) {
        console.error('Usage: echoes-mcp-server rag-search <timeline> "<query>" [options]');
        process.exit(1);
      }

      // Parse optional flags
      const topKFlag = args.indexOf('--top-k');
      const charactersFlag = args.indexOf('--characters');
      const arcFlag = args.indexOf('--arc');
      const povFlag = args.indexOf('--pov');
      const allCharacters = args.includes('--all-characters');
      const vectorOnly = args.includes('--vector-only');

      const topK = topKFlag !== -1 ? parseInt(args[topKFlag + 1], 10) : 10;
      const characters = charactersFlag !== -1 ? args[charactersFlag + 1].split(',') : undefined;
      const arc = arcFlag !== -1 ? args[arcFlag + 1] : undefined;
      const pov = povFlag !== -1 ? args[povFlag + 1] : undefined;

      try {
        const result = await ragSearch({
          timeline,
          query,
          topK,
          characters,
          allCharacters,
          arc,
          pov,
          useGraphRAG: !vectorOnly,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'rag-context': {
      const timeline = args[0];
      const query = args[1];

      if (!timeline || !query) {
        console.error('Usage: echoes-mcp-server rag-context <timeline> "<query>" [options]');
        process.exit(1);
      }

      // Parse optional flags
      const maxChaptersFlag = args.indexOf('--max-chapters');
      const charactersFlag = args.indexOf('--characters');
      const arcFlag = args.indexOf('--arc');
      const povFlag = args.indexOf('--pov');
      const allCharacters = args.includes('--all-characters');

      const maxChapters = maxChaptersFlag !== -1 ? parseInt(args[maxChaptersFlag + 1], 10) : 5;
      const characters = charactersFlag !== -1 ? args[charactersFlag + 1].split(',') : undefined;
      const arc = arcFlag !== -1 ? args[arcFlag + 1] : undefined;
      const pov = povFlag !== -1 ? args[povFlag + 1] : undefined;

      try {
        const result = await ragContext({
          timeline,
          query,
          maxChapters,
          characters,
          allCharacters,
          arc,
          pov,
        });
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
  echoes-mcp-server                              # Run MCP server
  echoes-mcp-server words-count <file>           # Count words in file
  echoes-mcp-server index-tracker <timeline> <path> # Sync filesystem to database
  echoes-mcp-server index-rag <timeline> <path>  # Index chapters into GraphRAG
  echoes-mcp-server rag-search <timeline> "<query>" # Search chapters semantically
  echoes-mcp-server rag-context <timeline> "<query>" # Get full chapter context for AI
  echoes-mcp-server help                         # Show this help

Options:
  --detailed                                     # Include detailed statistics (words-count)
  --arc <name>                                   # Filter by arc (index-rag, rag-search, rag-context)
  --episode <num>                                # Filter by episode (index-rag)
  --top-k <num>                                  # Max results (rag-search, default: 10)
  --max-chapters <num>                           # Max chapters (rag-context, default: 5)
  --characters <name1,name2>                     # Filter by characters (rag-search, rag-context)
  --all-characters                               # Require all characters (rag-search, rag-context)
  --pov <name>                                   # Filter by POV (rag-search, rag-context)
  --vector-only                                  # Use vector search only (rag-search)
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "echoes-mcp-server help" for usage information');
      process.exit(1);
  }
}

main().catch(console.error);
