# Echoes MCP Server

[![CI](https://github.com/echoes-io/mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/echoes-io/mcp-server/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@echoes-io/mcp-server)](https://www.npmjs.com/package/@echoes-io/mcp-server)
[![Node](https://img.shields.io/node/v/@echoes-io/mcp-server)](https://www.npmjs.com/package/@echoes-io/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Model Context Protocol server for AI integration with the Echoes storytelling platform — Mage image generation and content tools.

## Features

- **Mage Image Generation**: Queue, monitor, save, and commit AI-generated images via AppSync
- **Word Count**: Count words and text statistics in markdown chapter files
- **MCP Resources**: Expose Mage status, queue, results, and characters as MCP resources
- **CLI**: Full command-line interface for all operations
- **Thin Client**: No heavy dependencies — just GraphQL calls to AppSync

## Installation

```bash
npm install -g @echoes-io/mcp-server
```

Or run directly with npx:

```bash
npx @echoes-io/mcp-server --help
```

## Requirements

- Node.js 22+
- AppSync API URL and API Key (for Mage tools)

## Configuration

Create a `.env` file in your timeline repo root:

```env
PUBLISHER_API_URL=https://xxx.appsync-api.eu-west-1.amazonaws.com/graphql
PUBLISHER_API_KEY=da2-xxxxxxxxxxxxxxxxxxxx
```

The timeline is auto-detected from the cwd path (e.g., `/path/to/timeline-eros/` → `eros`).

### MCP Client Configuration

```json
{
  "mcpServers": {
    "publisher": {
      "command": "npx",
      "args": ["@echoes-io/mcp-server"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `words-count` | Count words and statistics in a markdown file |
| `mage_queue_add` | Queue a single image/video generation |
| `mage_queue_add_bulk` | Queue multiple generations (one prompt per line) |
| `mage_queue_list` | List queued and processing jobs |
| `mage_queue_pause` | Pause the queue |
| `mage_queue_resume` | Resume the queue |
| `mage_queue_cancel` | Cancel a queued job |
| `mage_results_list` | List generated results |
| `mage_results_save` | Save a result to S3 |
| `mage_results_save_all` | Save all unsaved results |
| `mage_commit` | Commit saved images to GitHub repos |
| `mage_status` | Get overall system status |
| `mage_characters_list` | List configured characters with placeholders |

## Available Resources

| URI | Description |
|-----|-------------|
| `publisher://mage/status` | Mage system status |
| `publisher://mage/queue` | Current queue |
| `publisher://mage/results` | Recent results |
| `publisher://mage/characters` | Configured characters |

## CLI Usage

```bash
# Word count
echoes words-count ./content/arc/ep01/ch001.md
echoes words-count -d ./content/arc/ep01/ch001.md  # detailed

# Start MCP server
echoes serve

# Mage commands
echoes mage status
echoes mage characters
echoes mage queue list
echoes mage queue add "[01] Full body of [ALE] at café" -t scene -a ale -e 1
echoes mage queue add-bulk "<prompts>" -t scene -a ale -e 1
echoes mage queue pause
echoes mage queue resume
echoes mage queue cancel <job-id>
echoes mage results list
echoes mage results list --unsaved
echoes mage results save <job-id>
echoes mage results save-all
echoes mage commit -m "🎨 Add ale ep01 scenes"
```

## Architecture

```
Agent (Kiro/Claude) → MCP Server (stdio) → AppSync (GraphQL, API Key) → Lambda/DynamoDB
                           ↑
                    .env in timeline repo root
```

The MCP server is a **thin GraphQL client** — it doesn't execute any generation logic. It calls the same AppSync mutations/queries used by the Publisher web portal.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Tech Stack

| Purpose | Tool |
|---------|------|
| Runtime | Node.js 22+ |
| Language | TypeScript |
| MCP SDK | @modelcontextprotocol/sdk |
| CLI | Commander |
| Testing | Vitest |
| Linting | Biome |

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project — a multi-POV digital storytelling platform.
