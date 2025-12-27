# Echoes MCP Server v6 - TypeScript Migration

## Executive Summary

Migration from Python to **TypeScript** to simplify installation and distribution. Removing spaCy (replaced by Gemini) enables a complete port while maintaining all Narrative Knowledge Graph features.

---

## Problem Statement (v5 Python)

The Python version has distribution issues:
- **Heavy spaCy model**: ~500MB separate download
- **uvx not ideal**: Isolated environment doesn't persist spaCy model
- **Complex installation**: Requires `--with` for extra dependencies
- **Heavy dependencies**: torch, sentence-transformers, spaCy = ~2GB

---

## Key Decisions

### 1. Language: TypeScript
**Rationale**:
- Mature npm ecosystem for distribution
- `npx` works out-of-the-box
- No heavy dependencies (no torch, no spaCy)
- Same language as rest of Echoes ecosystem

### 2. Entity Extraction: Gemini-only (no spaCy)
**Rationale**:
- Gemini 2.5/3 Flash superior for contextual understanding
- Extracts RELATIONS (spaCy cannot)
- No local model to download
- Reasonable cost (~$0.30/1M words)

### 3. Embeddings: Transformers.js (ONNX)
**Rationale**:
- `@huggingface/transformers` with ONNX models
- Multilingual models available
- No torch/Python required
- ~100MB vs ~2GB

### 4. Database: LanceDB (unchanged)
**Rationale**:
- `@lancedb/lancedb` complete SDK
- Compatible with existing Python databases
- File-based, committable

### 5. MCP SDK: Official TypeScript
**Rationale**:
- `@modelcontextprotocol/sdk` official
- Same SDK used by other MCP servers

---

## Architecture

### Project Structure

```
echoes-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli.ts                # CLI (commander)
│   ├── server.ts             # MCP server
│   ├── config.ts             # Configuration
│   ├── database/
│   │   ├── index.ts
│   │   ├── lancedb.ts        # LanceDB operations
│   │   └── schemas.ts        # Zod schemas
│   ├── indexer/
│   │   ├── index.ts
│   │   ├── scanner.ts        # Filesystem scanner
│   │   ├── extractor.ts      # Gemini entity extraction
│   │   └── embeddings.ts     # Transformers.js embeddings
│   ├── prompts/
│   │   ├── index.ts
│   │   ├── handlers.ts       # Prompt loading
│   │   ├── substitution.ts   # Placeholder replacement
│   │   └── validation.ts     # Arc validation
│   └── tools/
│       ├── index.ts
│       ├── words-count.ts
│       ├── stats.ts
│       ├── search.ts
│       └── index-tool.ts
├── tests/
│   └── *.test.ts
├── package.json
├── tsconfig.json
├── biome.json
└── README.md
```

### Dependencies

```json
{
  "dependencies": {
    "@google/genai": "^1.0.0",
    "@huggingface/transformers": "^3.0.0",
    "@lancedb/lancedb": "^0.22.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "apache-arrow": "^18.0.0",
    "commander": "^12.0.0",
    "gray-matter": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0"
  }
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     INDEXING PHASE                          │
├─────────────────────────────────────────────────────────────┤
│  1. Scan content/*.md (filesystem scanner)                  │
│  2. Parse frontmatter + content (gray-matter)               │
│  3. For each chapter:                                       │
│     a. Extract entities/relations with Gemini API          │
│     b. Generate embeddings (Transformers.js ONNX)          │
│     c. Calculate word count and statistics                 │
│  4. Save everything to LanceDB                              │
│  5. Update hash for change detection                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    LanceDB (v5 compatible)                  │
├─────────────────────────────────────────────────────────────┤
│  chapters.lance                                             │
│  entities.lance                                             │
│  relations.lance                                            │
│  metadata.json (version tracking)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## LanceDB Schemas (Zod)

### chapters.lance

```typescript
const ChapterRecord = z.object({
  // Identification
  id: z.string(),                    // "arc:ep01:ch001"
  file_path: z.string(),
  file_hash: z.string(),
  
  // Hierarchy
  arc: z.string(),
  episode: z.number(),
  chapter: z.number(),
  
  // Metadata
  pov: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  date: z.string().nullable(),
  
  // Content
  content: z.string(),
  summary: z.string().nullable(),
  
  // Statistics
  word_count: z.number(),
  char_count: z.number(),
  paragraph_count: z.number(),
  
  // RAG
  vector: z.array(z.number()),       // dimension auto-detected from model
  entities: z.array(z.string()),
  
  // Metadata
  indexed_at: z.number(),
});
```

### entities.lance

```typescript
const EntityRecord = z.object({
  id: z.string(),                    // "arc:CHARACTER:Alice"
  arc: z.string(),
  name: z.string(),
  type: z.enum(["CHARACTER", "LOCATION", "EVENT", "OBJECT", "EMOTION"]),
  description: z.string(),
  aliases: z.array(z.string()),
});
```

### relations.lance

```typescript
const RelationRecord = z.object({
  id: z.string(),                    // "arc:Alice:LOVES:Bob"
  arc: z.string(),
  source_entity: z.string(),
  target_entity: z.string(),
  type: z.enum([
    "LOVES", "HATES", "KNOWS", "RELATED_TO", "FRIENDS_WITH", "ENEMIES_WITH",
    "LOCATED_IN", "LIVES_IN", "TRAVELS_TO",
    "HAPPENS_BEFORE", "HAPPENS_AFTER", "CAUSES",
    "OWNS", "USES", "SEEKS"
  ]),
  description: z.string(),
  weight: z.number().min(0).max(1),
  chapters: z.array(z.string()),
});
```

---

## MCP Tools (unchanged from v5)

| Tool | Description |
|------|-------------|
| `version` | Get server version |
| `words-count` | Count words in markdown file |
| `index` | Index timeline content |
| `search-semantic` | Semantic search on chapters |
| `search-entities` | Search entities by name/type |
| `search-relations` | Search relationships |
| `stats` | Aggregate statistics |

---

## MCP Prompts (unchanged from v5)

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| `new-chapter` | arc, chapter | Create new chapter |
| `revise-chapter` | arc, chapter | Revise chapter |
| `expand-chapter` | arc, chapter, target | Expand to word count |
| `new-character` | name | Create character sheet |
| `new-episode` | arc, episode | Create episode outline |
| `new-arc` | name | Create story arc |
| `revise-arc` | arc | Review entire arc |

---

## CLI Interface

```bash
# Indexing
echoes index ./content
echoes index ./content --force
echoes index ./content --arc bloom

# Search
echoes search "Alice meets Bob"
echoes search "Alice" --type entities

# Stats
echoes stats
echoes stats --arc bloom --pov Alice

# Words count
echoes words-count ./content/arc1/ep01/ch001.md

# Version
echoes --version
```

---

## Environment Variables

```bash
# Required for entity extraction
GEMINI_API_KEY=your_api_key

# Optional: custom Gemini model (default: gemini-2.5-flash)
ECHOES_GEMINI_MODEL=gemini-2.5-flash

# Optional: custom embedding model (dimension auto-detected, default: Xenova/multilingual-e5-small)
ECHOES_EMBEDDING_MODEL=Xenova/multilingual-e5-small

# Optional: HuggingFace token for gated/private models (read automatically by @huggingface/transformers)
HF_TOKEN=hf_xxx
```

---

## Installation & Usage

### Via npx (recommended)

```bash
npx echoes-mcp-server index ./content
```

### Via npm global

```bash
npm install -g echoes-mcp-server
echoes index ./content
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "echoes": {
      "command": "npx",
      "args": ["echoes-mcp-server"],
      "cwd": "/path/to/timeline",
      "env": {
        "GEMINI_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

## TypeScript Tooling

| Purpose | Tool |
|---------|------|
| Package manager | npm/pnpm |
| Linter/Formatter | Biome |
| Type checker | TypeScript |
| Testing | Vitest |
| Build | tsup / esbuild |
| Versioning | semantic-release |

### package.json scripts

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "biome check .",
    "lint:fix": "biome check . --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Migration Plan

### Phase 1: Project Setup
- [x] Create new TypeScript project
- [x] Configure tsup, biome, vitest
- [x] Setup GitHub Actions (CI + Release)
- [x] Create README.md

### Phase 2: Core (database + scanner)
- [x] Port LanceDB wrapper with Arrow schemas
- [x] Port filesystem scanner
- [x] Port words-count tool
- [x] Port stats tool

### Phase 3: Embeddings
- [x] Integrate @huggingface/transformers
- [x] Auto-detect embedding dimension from model config
- [x] Database migration on model/dimension change
- [x] 100% test coverage

### Phase 4: Entity Extraction
- [x] Integrate @google/genai
- [x] Structured output with Zod schemas
- [x] Configurable model via env var
- [x] Implement index tool

### Phase 5: Search
- [x] Port search-semantic
- [x] Port search-entities
- [x] Port search-relations

### Phase 6: MCP Server
- [x] Port MCP server with official SDK
- [x] Port prompts handlers
- [x] ~~Port version tool~~ (not needed - MCP SDK exposes version automatically)

### Phase 7: CLI
- [x] Implement CLI with commander
- [x] words-count command
- [x] stats command
- [x] index command
- [x] search command

### Phase 8: Release
- [x] Update package.json for npm
- [x] Update GitHub Actions for Node.js
- [x] Rewrite README
- [x] Remove Python code
- [ ] Publish to npm (requires NPM_TOKEN secret)
- [ ] Deprecate Python version on PyPI

---

## Backward Compatibility

### Database
- LanceDB schema identical to v5
- Existing databases compatible
- Automatic migration via metadata.json version check

### API
- Same tool names and parameters
- Same prompt names and arguments
- Identical JSON output

### Breaking Changes
- Requires `GEMINI_API_KEY` (spaCy fallback removed)
- Requires Node.js 20+ (instead of Python 3.11+)

---

## Comparison v5 (Python) vs v6 (TypeScript)

| Aspect | v5 Python | v6 TypeScript |
|--------|-----------|---------------|
| Install size | ~2GB | ~100MB |
| Install command | `uvx --with spacy...` | `npx echoes-mcp-server` |
| Entity extraction | Gemini + spaCy fallback | Gemini only |
| Embeddings | sentence-transformers | Transformers.js ONNX |
| Runtime | Python 3.11+ | Node.js 20+ |
| Package registry | PyPI | npm |

---

## Quality Standards

- **Test coverage**: 100% (statement, branch, function, line)
- **Type safety**: Strict TypeScript
- **Linting**: Biome with zero warnings
- **Documentation**: JSDoc for public functions
- **Commits**: Conventional Commits

---

## References

- [@lancedb/lancedb](https://www.npmjs.com/package/@lancedb/lancedb)
- [@google/genai](https://www.npmjs.com/package/@google/genai)
- [@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers)
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [LlamaIndex.TS](https://ts.llamaindex.ai/)
