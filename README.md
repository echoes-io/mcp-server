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
      "args": ["-y", "@echoes-io/mcp-server"]
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
      "command": "echoes-mcp-server"
    }
  }
}
```

## Usage

Once configured, the server provides tools for:
- Content management (chapters, episodes, arcs)
- Word counting and text statistics
- Database operations via @echoes-io/tracker
- Timeline synchronization

Available tools will be listed by your MCP client.

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
- **Testing**: Vitest
- **Linting**: Biome
- **Build**: TypeScript compiler

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
