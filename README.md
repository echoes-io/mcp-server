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
        "ECHOES_TIMELINE": "your-timeline-name"
      }
    }
  }
}
```

**Important:** The `ECHOES_TIMELINE` environment variable must be set to specify which timeline to work with. All tools operate on this timeline.

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
npm run lint:fix
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

## Roadmap

### Planned Features
- **Statistics tools** - Aggregate statistics for timelines/arcs/episodes
- **Book generation** - LaTeX/PDF compilation (when ready)
- **Performance optimizations** - Caching and batch operations

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
