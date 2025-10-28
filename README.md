# mcp-server

Model Context Protocol server for AI integration with Echoes storytelling platform

## Installation

The server is distributed as an npm package and can be used without cloning the repository.

### Using with MCP Clients

Add to your MCP client configuration (e.g., `~/.config/q/mcp.json` for Amazon Q):

```json
{
  "mcpServers": {
    "echoes": {
      "command": "npx",
      "args": ["-y", "@echoes-io/mcp-server"],
      "env": {
        "ECHOES_TIMELINE": "your-timeline-name"
      }
    }
  }
}
```

Or install globally:

```bash
npm install -g @echoes-io/mcp-server
```

Then configure:

```json
{
  "mcpServers": {
    "echoes": {
      "command": "echoes-mcp-server",
      "env": {
        "ECHOES_TIMELINE": "your-timeline-name",
        "ECHOES_RAG_PROVIDER": "e5-small",
        "ECHOES_RAG_DB_PATH": "./rag_data.db"
      }
    }
  }
}
```

**Important:** The `ECHOES_TIMELINE` environment variable must be set to specify which timeline to work with. All tools operate on this timeline.

**Optional RAG Configuration:**
- `ECHOES_RAG_PROVIDER`: Embedding provider (`e5-small`, `e5-large`, or `gemini`). Default: `e5-small`
- `ECHOES_GEMINI_API_KEY`: Required if using `gemini` provider
- `ECHOES_RAG_DB_PATH`: SQLite database path. Default: `./rag_data.db`

## Available Tools

All tools operate on the timeline specified by the `ECHOES_TIMELINE` environment variable.

### Content Operations
- **`words-count`** - Count words and text statistics in markdown files
  - Input: `file` (path to markdown file)
  
- **`chapter-info`** - Extract chapter metadata from database
  - Input: `arc`, `episode`, `chapter`
  
- **`chapter-refresh`** - Refresh chapter metadata and word counts from file
  - Input: `file` (path to chapter file)
  
- **`chapter-insert`** - Insert new chapter with automatic renumbering
  - Input: `arc`, `episode`, `after`, `pov`, `title`, optional: `excerpt`, `location`, `outfit`, `kink`, `file`
  
- **`chapter-delete`** - Delete chapter from database and optionally from filesystem
  - Input: `arc`, `episode`, `chapter`, optional: `file` (to delete from filesystem)

### Episode Operations
- **`episode-info`** - Get episode information and list of chapters
  - Input: `arc`, `episode`
  
- **`episode-update`** - Update episode metadata (description, title, slug)
  - Input: `arc`, `episode`, optional: `description`, `title`, `slug`

### Timeline Operations
- **`timeline-sync`** - Synchronize filesystem content with database
  - Input: `contentPath` (path to content directory)

### Statistics
- **`stats`** - Get aggregate statistics with optional filters
  - Input: optional: `arc`, `episode`, `pov`
  - Output: Total words/chapters, POV distribution, arc/episode breakdown, longest/shortest chapters
  - Examples:
    - No filters: Overall timeline statistics
    - `arc: "arc1"`: Statistics for specific arc
    - `arc: "arc1", episode: 1`: Statistics for specific episode
    - `pov: "Alice"`: Statistics for specific POV across timeline

### RAG (Semantic Search)
- **`rag-index`** - Index chapters into vector database for semantic search
  - Input: `contentPath` (path to content directory, required for full content indexing), optional: `arc`, `episode` (to index specific content)
  - Output: Number of chapters indexed
  - Note: Requires `contentPath` to read and index actual chapter content. Without it, only metadata is indexed.
  
- **`rag-search`** - Semantic search across timeline content
  - Input: `query`, optional: `arc`, `pov`, `maxResults`
  - Output: Relevant chapters with similarity scores and previews
  
- **`rag-context`** - Retrieve relevant context for AI interactions
  - Input: `query`, optional: `arc`, `pov`, `maxChapters`
  - Output: Full chapter content for AI context

### Book Generation
- **`book-generate`** - Generate PDF book from timeline content using LaTeX
  - Input: `contentPath`, `outputPath`, optional: `episodes`, `format`
  - Output: PDF book with Victoria Regia template
  - Formats: `a4` (default), `a5`
  - Requirements: pandoc, LaTeX distribution (pdflatex/xelatex/lualatex)

## Development

### Scripts

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint

# Fix linting issues
npm run lint:format
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Testing**: Vitest (97%+ coverage)
- **Linting**: Biome
- **Build**: TypeScript compiler

### Architecture

- **MCP Protocol**: Standard Model Context Protocol implementation
- **Database**: SQLite via @echoes-io/tracker (singleton pattern)
- **Validation**: Zod schemas for type-safe inputs
- **Testing**: Comprehensive unit and integration tests
- **Environment**: Uses `ECHOES_TIMELINE` env var for timeline context

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
