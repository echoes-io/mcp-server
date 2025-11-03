# mcp-server

Model Context Protocol server for AI integration with Echoes storytelling platform

## Installation

The server is distributed as an npm package and can be used without cloning the repository.

### Using with MCP Clients

**Important:** The server must be run from the `.github` directory of your Echoes project.

Add to your MCP client configuration (e.g., `~/.config/q/mcp.json` for Amazon Q):

```json
{
  "mcpServers": {
    "echoes": {
      "command": "npx",
      "args": ["-y", "@echoes-io/mcp-server"],
      "cwd": "/path/to/echoes-io/.github"
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
      "cwd": "/path/to/echoes-io/.github",
      "env": {
        "ECHOES_RAG_PROVIDER": "e5-small"
      }
    }
  }
}
```

**Optional RAG Configuration:**
- `ECHOES_RAG_PROVIDER`: Embedding provider (`e5-small`, `e5-large`, or `gemini`). Default: `e5-small`
- `ECHOES_GEMINI_API_KEY`: Required if using `gemini` provider

## Multi-Timeline Architecture

The server automatically discovers and manages multiple timelines:

```
echoes-io/
  .github/              # Server runs from here
  timeline-eros/        # Private timeline repo
    tracker.db          # Timeline-specific database
    rag.db              # Timeline-specific RAG index
    content/...
  timeline-other/       # Another private timeline
    tracker.db
    rag.db
    content/...
```

**Benefits:**
- Each timeline has isolated databases in its own repository
- Timeline repositories can be private while `.github` is public
- No need to specify `contentPath` - auto-discovered from directory structure
- Easy to manage access: just share/don't share specific timeline repos


## Available Tools

All tools require a `timeline` parameter to specify which timeline to operate on.

### Content Operations
- **`words-count`** - Count words and text statistics in markdown files
  - Input: `file` (path to markdown file)
  
- **`chapter-info`** - Extract chapter metadata from database
  - Input: `arc`, `episode`, `chapter`
  
- **`chapter-refresh`** - Refresh chapter metadata and word counts from file
  - Input: `file` (path to chapter file)
  
- **`chapter-insert`** - Insert new chapter with automatic renumbering
  - Input: `arc`, `episode`, `after`, `pov`, `title`, optional: `summary`, `location`, `outfit`, `kink`, `file`
  
- **`chapter-delete`** - Delete chapter from database and optionally from filesystem
  - Input: `arc`, `episode`, `chapter`, optional: `file` (to delete from filesystem)

### Episode Operations
- **`episode-info`** - Get episode information and list of chapters
  - Input: `arc`, `episode`
  
- **`episode-update`** - Update episode metadata (description, title, slug)
  - Input: `arc`, `episode`, optional: `description`, `title`, `slug`

### Timeline Operations
- **`timeline-sync`** - Synchronize filesystem content with database
  - Input: `timeline` (timeline name)
  - Note: Content path is auto-discovered from timeline directory structure

### Statistics
- **`stats`** - Get aggregate statistics with optional filters
  - Input: `timeline`, optional: `arc`, `episode`, `pov`
  - Output: Total words/chapters, POV distribution, arc/episode breakdown, longest/shortest chapters
  - Examples:
    - No filters: Overall timeline statistics
    - `arc: "arc1"`: Statistics for specific arc
    - `arc: "arc1", episode: 1`: Statistics for specific episode
    - `pov: "Alice"`: Statistics for specific POV across timeline

### RAG (Semantic Search)
- **`rag-index`** - Index chapters into vector database for semantic search
  - Input: `timeline`, optional: `arc`, `episode` (to index specific content)
  - Output: Number of chapters indexed
  - Note: Content path is auto-discovered from timeline directory structure
  - Note: Automatically extracts character names using NER (Named Entity Recognition)
  
- **`rag-search`** - Semantic search across timeline content
  - Input: `timeline`, `query`, optional: `arc`, `pov`, `maxResults`, `characters`, `allCharacters`
  - Output: Relevant chapters with similarity scores, previews, and character names
  - Character filtering:
    - `characters`: Array of character names to filter by
    - `allCharacters`: If true, all characters must be present (AND). If false, at least one (OR). Default: false
  - Examples:
    - `characters: ["Alice", "Bob"], allCharacters: true` - Find chapters where both Alice AND Bob appear
    - `characters: ["Alice", "Bob"]` - Find chapters where Alice OR Bob appear
  
- **`rag-context`** - Retrieve relevant context for AI interactions
  - Input: `timeline`, `query`, optional: `arc`, `pov`, `maxChapters`, `characters`
  - Output: Full chapter content for AI context with character names
  - Supports character filtering like `rag-search`
  
- **`rag-characters`** - Get all characters that appear in chapters with a specific character
  - Input: `timeline`, `character` (character name)
  - Output: List of co-occurring characters sorted alphabetically
  - Use case: "Who does character X interact with?"

### Book Generation
- **`book-generate`** - Generate PDF book from timeline content using LaTeX
  - Input: `timeline`, `outputPath`, optional: `episodes`, `format`
  - Output: PDF book with Victoria Regia template
  - Formats: `a4` (default), `a5`
  - Requirements: pandoc, LaTeX distribution (pdflatex/xelatex/lualatex)
  - Note: Content path is auto-discovered from timeline directory structure

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
- **Timeline Parameter**: All tools accept timeline as a required parameter

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
