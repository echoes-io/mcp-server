# echoes-mcp-server

Model Context Protocol server for **Echoes** - AI integration layer for multi-POV storytelling platform.

## Overview

This MCP server provides AI tools for content management, database operations, and book generation across the Echoes ecosystem. It integrates with Amazon Q CLI and other MCP-compatible AI systems.

## Features

### Content Operations
- **`words-count`** - Count words in markdown chapter files
- **`chapter-info`** - Extract metadata and statistics from chapters
- **`episode-info`** - Get episode metadata and list of chapters

### Tracker Operations
- **`words-update`** - Update word counts for entire timeline in database
- **`chapter-add`** - Create new chapter in tracker database
- **`chapter-update`** - Update chapter metadata in database
- **`chapter-delete`** - Remove chapter from tracker database
- **`episode-add`** - Create new episode in database
- **`episode-update`** - Update episode metadata in database

### Book Generation
- **`book-generate`** - Compile LaTeX book for timeline
- **`timeline-sync`** - Synchronize entire timeline with database

## Content Hierarchy

The server works with Echoes content structure:

```
Timeline (story universe)
├── Arc (story phase)
│   ├── Episode (story event)
│   │   ├── Part (optional subdivision)
│   │   │   └── Chapter (individual .md file)
```

**File Convention**: `content/<arc-name>/<ep01-episode-title>/<ep01-ch001-pov-title>.md`

**Chapter Frontmatter**:
```yaml
---
pov: string          # Point of view character
title: string        # Chapter title
date: string         # Publication date
timeline: string     # Timeline name
arc: string          # Arc name
episode: number      # Episode number
part: number         # Part number
chapter: number      # Chapter number
excerpt: string      # Short description
location: string     # Scene location
outfit: string       # (optional) Character outfit
kink: string         # (optional) Content tags
---
```

## Dependencies

- **@echoes-io/utils** - Markdown parsing and text statistics
- **@echoes-io/models** - TypeScript types and validation schemas
- **@echoes-io/tracker** - SQLite database operations

## Installation

```bash
npm install
```

## Usage

### With Amazon Q CLI

The server integrates automatically with Amazon Q when configured as an MCP server.

### Standalone

```bash
npm start
```

## Tools Reference

### `words-count`

Count words in a markdown file.

**Parameters:**
- `file` (string) - Path to markdown file

**Returns:**
- Word count and text statistics

### `chapter-info`

Extract complete chapter information.

**Parameters:**
- `file` (string) - Path to chapter markdown file

**Returns:**
- Metadata, content, and text statistics

### `chapter-add`

Add new chapter to tracker database.

**Parameters:**
- `file` (string) - Path to chapter markdown file
- `timeline` (string) - Timeline name

**Returns:**
- Created chapter record

## Development

### Tech Stack
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js
- **Protocol**: Model Context Protocol (MCP)
- **Database**: SQLite via @echoes-io/tracker
- **Testing**: Vitest
- **Linting**: Biome

### Scripts
```bash
# Development
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Architecture

The MCP server acts as a bridge between AI systems and the Echoes content ecosystem:

```
AI System (Amazon Q) 
    ↓ MCP Protocol
echoes-mcp-server
    ↓ Dependencies
@echoes-io/utils + @echoes-io/models + @echoes-io/tracker
    ↓ File System + Database
Content Files (.md) + SQLite Database
```

## Error Handling

All tools include comprehensive error handling:
- File system errors (missing files, permissions)
- Validation errors (invalid frontmatter, missing fields)
- Database errors (connection issues, constraint violations)
- MCP protocol errors (invalid parameters, tool failures)

## License

MIT

---

Part of the [Echoes](https://github.com/echoes-io) project - a multi-POV digital storytelling platform.
