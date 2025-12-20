#!/usr/bin/env node

import { runServer } from '../src/server.js';
import { indexRag } from '../src/tools/index-rag.js';
import { indexTracker } from '../src/tools/index-tracker.js';
import { ragContext } from '../src/tools/rag-context.js';
import { ragSearch } from '../src/tools/rag-search.js';
import { wordsCount } from '../src/tools/words-count.js';
import { getTimelineContext } from '../src/utils/timeline-detection.js';

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
      const timelineArg = args[0];
      const contentPathArg = args[1];

      try {
        const { timeline, contentPath } = getTimelineContext(timelineArg, contentPathArg);
        const result = await indexTracker({ timeline, contentPath });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'index-rag': {
      const timelineArg = args[0];
      const contentPathArg = args[1];
      const arcFlag = args.indexOf('--arc');
      const episodeFlag = args.indexOf('--episode');

      try {
        const { timeline, contentPath } = getTimelineContext(timelineArg, contentPathArg);
        const arc = arcFlag !== -1 ? args[arcFlag + 1] : undefined;
        const episode = episodeFlag !== -1 ? parseInt(args[episodeFlag + 1], 10) : undefined;

        const result = await indexRag({ timeline, contentPath, arc, episode });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;
    }

    case 'rag-search': {
      const timelineArg = args[0];
      const query = args[1] || args[0]; // If no timeline provided, first arg is query

      try {
        const { timeline } = getTimelineContext(timelineArg && args[1] ? timelineArg : undefined);
        const actualQuery = args[1] ? query : timelineArg; // Adjust query based on args

        if (!actualQuery) {
          console.error('Usage: echoes-mcp-server rag-search "<query>" [options]');
          console.error('   or: echoes-mcp-server rag-search <timeline> "<query>" [options]');
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

        const result = await ragSearch({
          timeline,
          query: actualQuery,
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
      const timelineArg = args[0];
      const query = args[1] || args[0]; // If no timeline provided, first arg is query

      try {
        const { timeline } = getTimelineContext(timelineArg && args[1] ? timelineArg : undefined);
        const actualQuery = args[1] ? query : timelineArg; // Adjust query based on args

        if (!actualQuery) {
          console.error('Usage: echoes-mcp-server rag-context "<query>" [options]');
          console.error('   or: echoes-mcp-server rag-context <timeline> "<query>" [options]');
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

        const result = await ragContext({
          timeline,
          query: actualQuery,
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
  echoes-mcp-server index-tracker [timeline] [path] # Sync filesystem to database (auto-detects from cwd)
  echoes-mcp-server index-rag [timeline] [path]  # Index chapters into GraphRAG (auto-detects from cwd)
  echoes-mcp-server rag-search "<query>"         # Search chapters semantically (auto-detects timeline)
  echoes-mcp-server rag-context "<query>"        # Get full chapter context for AI (auto-detects timeline)
  echoes-mcp-server help                         # Show this help

Auto-Detection:
  Run from timeline-* directory: auto-detects timeline and content path
  Run from .github directory: multi-timeline mode (requires explicit timeline)
  Run from mcp-server directory: test mode

Examples:
  cd timeline-pulse && echoes-mcp-server index-tracker    # Auto-detects "pulse" timeline
  cd timeline-pulse && echoes-mcp-server rag-search "romantic scene"
  echoes-mcp-server rag-search pulse "romantic scene"    # Explicit timeline

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
