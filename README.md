# Echoes MCP Server

[![CI](https://github.com/echoes-io/mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/echoes-io/mcp-server/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@echoes-io/mcp-server)](https://www.npmjs.com/package/@echoes-io/mcp-server)
[![Node](https://img.shields.io/node/v/@echoes-io/mcp-server)](https://www.npmjs.com/package/@echoes-io/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-99%25-brightgreen?style=flat)

Model Context Protocol server for AI integration with Echoes storytelling platform.

## Features

- **Narrative Knowledge Graph**: Automatically extracts characters, locations, events, and their relationships using Gemini AI
- **Semantic Search**: Find relevant chapters using natural language queries
- **Entity Search**: Search for characters, locations, and events
- **Relation Search**: Explore relationships between entities
- **Arc Isolation**: Each arc is a separate narrative universe - no cross-arc contamination
- **Statistics**: Aggregate word counts, POV distribution, and more
- **Dynamic Prompts**: Reusable prompt templates with placeholder substitution

## Installation

```bash
npm install -g @echoes-io/mcp-server
```

Or run directly with npx:

```bash
npx @echoes-io/mcp-server --help
```

## Requirements

- Node.js 20+
- Gemini API key (for entity extraction)

## Usage

### CLI

```bash
# Count words in a markdown file
echoes words-count ./content/arc1/ep01/ch001.md

# Index timeline content
echoes index ./content

# Index only a specific arc
echoes index ./content --arc bloom

# Get statistics
echoes stats
echoes stats --arc arc1 --pov Alice

# Search (filters by arc to avoid cross-arc contamination)
echoes search "primo incontro" --arc bloom
echoes search "Alice" --type entities --arc bloom

# Check narrative consistency
echoes check-consistency bloom
echoes check-consistency bloom --rules kink-firsts,outfit-claims
```

### MCP Server

Configure in your MCP client (e.g., Claude Desktop, Kiro):

```json
{
  "mcpServers": {
    "echoes": {
      "command": "npx",
      "args": ["@echoes-io/mcp-server"],
      "cwd": "/path/to/timeline",
      "env": {
        "GEMINI_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | API key for Gemini entity extraction |
| `ECHOES_GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model for extraction |
| `ECHOES_EMBEDDING_MODEL` | No | `Xenova/e5-small-v2` | HuggingFace embedding model |
| `ECHOES_EMBEDDING_DTYPE` | No | `fp32` | Quantization level: `fp32`, `q8`, `q4` (see Performance Notes) |
| `HF_TOKEN` | No | - | HuggingFace token for gated models |

## Available Tools

| Tool | Description |
|------|-------------|
| `words-count` | Count words and statistics in a markdown file |
| `index` | Index timeline content into LanceDB |
| `search` | Search chapters, entities, or relations |
| `stats` | Get aggregate statistics |
| `check-consistency` | Analyze arc for narrative inconsistencies |
| `graph-export` | Export knowledge graph in various formats |
| `history` | Query character/arc history (kinks, outfits, locations, relations) |
| `review-generate` | Generate review file for pending entity/relation extractions |
| `review-status` | Show review statistics for an arc |
| `review-apply` | Apply corrections from review file to database |

## Available Prompts

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| `arc-resume` | arc, episode?, lastChapters? | Load complete context for resuming work on an arc |
| `new-chapter` | arc, chapter | Create a new chapter |
| `revise-chapter` | arc, chapter | Revise an existing chapter |
| `expand-chapter` | arc, chapter, target | Expand chapter to target word count |
| `new-character` | name | Create a new character sheet |
| `new-episode` | arc, episode | Create a new episode outline |
| `new-arc` | name | Create a new story arc |
| `revise-arc` | arc | Review and fix an entire arc |

## Architecture

### Content Hierarchy

```
Timeline (content directory)
└── Arc (story universe)
    └── Episode (story event)
        └── Chapter (individual .md file)
```

### Arc Isolation

Each arc is treated as a separate narrative universe:
- Entities are scoped to arcs: `bloom:CHARACTER:Alice` ≠ `work:CHARACTER:Alice`
- Relations are internal to arcs
- Searches can be filtered by arc to avoid cross-arc contamination

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     INDEXING PHASE                          │
├─────────────────────────────────────────────────────────────┤
│  1. Scan content/*.md (filesystem scanner)                  │
│  2. Parse frontmatter + content (gray-matter)               │
│  3. For each chapter:                                       │
│     a. Extract entities/relations with Gemini API           │
│     b. Generate embeddings (Transformers.js ONNX)           │
│     c. Calculate word count and statistics                  │
│  4. Save everything to LanceDB                              │
└─────────────────────────────────────────────────────────────┘
```

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
npm run typecheck

# Build
npm run build
```

## Tech Stack

| Purpose | Tool |
|---------|------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Vector DB | LanceDB |
| Embeddings | @huggingface/transformers (ONNX) |
| Entity Extraction | Gemini AI |
| MCP SDK | @modelcontextprotocol/sdk |
| Testing | Vitest |
| Linting | Biome |

## Performance Notes

### Embedding Quantization

The default embedding model (`Xenova/e5-small-v2`) supports different quantization levels via `ECHOES_EMBEDDING_DTYPE`:

| Level | Speed | Quality | Memory | Recommendation |
|-------|-------|---------|---------|----------------|
| `fp32` | Baseline | Best (100%) | High | Production with ample resources |
| `q8` | 2-3x faster | Excellent (99.6%) | 50% less | **Recommended** - optimal balance |
| `q4` | 3-4x faster | Good (99.1%) | 75% less | Resource-constrained environments |

**Note**: Some models like `onnx-community/embeddinggemma-300m-ONNX` don't support `fp16`. Always check model documentation.

**Recommended setting**:
```bash
export ECHOES_EMBEDDING_DTYPE=q8
```

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
