# Echoes MCP Server — FlowRAG Integration

## Executive Summary

Replace the custom RAG implementation in echoes-mcp-server with [FlowRAG](https://github.com/Zweer/FlowRAG) as the underlying engine for indexing, search, and knowledge graph management. This eliminates ~60% of custom code while gaining graph traversal, reranker support, entity merging, and multi-provider flexibility for free.

---

## Problem Statement

echoes-mcp-server v7.1 has a fully custom RAG stack:
- **Custom LanceDB wrapper** (`lib/database/index.ts`, 300+ LOC) — manual Arrow schemas, table management, migration logic
- **Custom embeddings** (`lib/indexer/embeddings.ts`, 100 LOC) — direct `@huggingface/transformers` usage
- **Custom extractor** (`lib/indexer/extractor.ts`, 80 LOC) — direct `@google/genai` usage
- **Custom indexing pipeline** (`lib/indexer/tasks.ts`, 250 LOC) — manual entity aggregation, hash detection
- **Custom search** (`lib/tools/search.ts`, 150 LOC) — manual vector search + text filtering

This code duplicates what FlowRAG already provides with better abstractions, more features, and 100% test coverage.

### What we maintain twice

| Capability | echoes-mcp-server | FlowRAG equivalent |
|---|---|---|
| LanceDB vector storage | `lib/database/index.ts` | `@flowrag/storage-lancedb` |
| SQLite graph storage | _(not available)_ | `@flowrag/storage-sqlite` |
| Gemini entity extraction | `lib/indexer/extractor.ts` | `@flowrag/provider-gemini` |
| Local ONNX embeddings | `lib/indexer/embeddings.ts` | `@flowrag/provider-local` |
| Indexing pipeline | `lib/indexer/tasks.ts` | `@flowrag/pipeline` |
| Semantic search | `lib/tools/search.ts` | `@flowrag/pipeline` (search) |
| Graph export (JSON, DOT) | `lib/tools/graph-export.ts` | `rag.export('json' \| 'dot')` |
| Hash-based change detection | `lib/indexer/tasks.ts` | `@flowrag/pipeline` (incremental) |
| Schema definition | `lib/database/schemas.ts` | `@flowrag/core` (defineSchema) |
| Arc isolation (namespace) | Manual `arc` filter on every query | `@flowrag/core` (withNamespace) |

### What FlowRAG adds that we don't have

- **Graph traversal**: `traverse(startId, depth)`, `findPath(from, to)` — follow entity relationships
- **Dual retrieval**: Vector search + graph expansion merged and deduped
- **Reranker**: Optional cross-encoder for better result quality
- **Entity merging**: `rag.mergeEntities({ sources, target })`
- **Multi-provider**: Switch between Gemini/OpenAI/Bedrock/Anthropic/local without code changes
- **Observability hooks**: `onLLMCall`, `onEmbedding`, `onSearch` for monitoring
- **Document deletion**: With automatic orphaned entity/relation cleanup

---

## Key Decisions

### 1. FlowRAG as library dependency (not fork/merge)

**Rationale**: Import `@flowrag/*` packages as npm dependencies. Echoes stays a thin narrative-specific layer on top.

### 2. Keep narrative-specific tools in Echoes

**Rationale**: Consistency checker, history tool, words-count, stats, prompts, and review system are domain-specific. They stay in echoes-mcp-server but query FlowRAG's storage.

### 3. Arc isolation via FlowRAG namespaces

**Rationale**: FlowRAG's `withNamespace(storage, arcName)` provides the same arc isolation we do manually today, but at the storage level — cleaner and more reliable.

### 4. No chunking (1 chapter = 1 document)

**Rationale**: Narrative chapters are self-contained units (~2000-5000 words). Chunking would break narrative coherence. FlowRAG supports this via `chunkSize: Infinity` or a custom no-op chunker.

### 5. Custom document parser for frontmatter

**Rationale**: Echoes chapters have rich YAML frontmatter (pov, arc, episode, chapter, location, outfit, kink). We need a custom parser that maps this to FlowRAG's `DocumentMetadata.fields`.

---

## Architecture

### Before (v7.1)

```
echoes-mcp-server
├── lib/database/          ← Custom LanceDB wrapper (DELETE)
│   ├── index.ts           ← 300 LOC
│   └── schemas.ts         ← Arrow schemas
├── lib/indexer/            ← Custom RAG pipeline (DELETE)
│   ├── embeddings.ts      ← @huggingface/transformers
│   ├── extractor.ts       ← @google/genai
│   ├── scanner.ts         ← Filesystem scanner
│   └── tasks.ts           ← Listr2 indexing pipeline
├── lib/tools/              ← MCP tools
│   ├── search.ts          ← Custom vector search (REWRITE)
│   ├── graph-export.ts    ← Custom graph export (REWRITE)
│   ├── index.ts           ← Index tool (REWRITE)
│   ├── review-*.ts        ← HITL review (REWRITE)
│   ├── list.ts            ← List entities/relations (REWRITE)
│   ├── consistency/       ← Narrative rules (KEEP, rewire)
│   ├── history.ts         ← Character tracker (KEEP, rewire)
│   ├── stats.ts           ← Statistics (KEEP, rewire)
│   └── words-count.ts     ← Word count (KEEP, standalone)
├── lib/prompts/            ← MCP prompts (KEEP, no changes)
├── lib/server.ts           ← MCP server (KEEP, minimal changes)
├── lib/utils.ts            ← Frontmatter parsing (KEEP)
├── lib/types.ts            ← Types (KEEP)
└── lib/constants.ts        ← Constants (SIMPLIFY)
```

### After (v8)

```
echoes-mcp-server
├── lib/rag/                ← FlowRAG integration layer (NEW)
│   ├── index.ts            ← createEchoesRAG() factory
│   ├── schema.ts           ← Narrative schema definition
│   └── parser.ts           ← Frontmatter document parser
├── lib/tools/              ← MCP tools (rewired to FlowRAG)
│   ├── search.ts           ← Delegates to rag.search()
│   ├── graph-export.ts     ← Delegates to rag.export() + Mermaid
│   ├── index.ts            ← Delegates to rag.index()
│   ├── review-*.ts         ← Queries FlowRAG graph storage
│   ├── list.ts             ← Queries FlowRAG graph storage
│   ├── consistency/        ← Queries FlowRAG storage
│   ├── history.ts          ← Queries FlowRAG storage
│   ├── stats.ts            ← Queries FlowRAG storage
│   └── words-count.ts      ← Standalone (no changes)
├── lib/prompts/            ← MCP prompts (no changes)
├── lib/server.ts           ← MCP server (no changes)
├── lib/utils.ts            ← Frontmatter parsing (no changes)
├── lib/types.ts            ← Types (simplified)
└── lib/constants.ts        ← Constants (simplified)
```

### Dependency Graph

```
echoes-mcp-server
├── @flowrag/core           ← Schema, types, interfaces
├── @flowrag/pipeline       ← Indexing + search
├── @flowrag/storage-lancedb ← Vector storage (same DB as before)
├── @flowrag/storage-sqlite  ← Graph storage (entities/relations)
├── @flowrag/storage-json    ← KV storage (document cache)
├── @flowrag/provider-local  ← ONNX embeddings
├── @flowrag/provider-gemini ← Entity extraction
├── @modelcontextprotocol/sdk ← MCP server
├── commander               ← CLI
├── listr2                  ← Progress display
├── gray-matter             ← Frontmatter parsing
└── zod                     ← Validation
```

### Removed Dependencies

```diff
- @google/genai              ← Replaced by @flowrag/provider-gemini
- @huggingface/transformers  ← Replaced by @flowrag/provider-local
- @lancedb/lancedb           ← Replaced by @flowrag/storage-lancedb
- apache-arrow               ← No longer needed (FlowRAG handles schemas)
- remove-markdown            ← Moved to parser or kept minimal
```

---

## FlowRAG Integration Layer

### Schema Definition

```typescript
// lib/rag/schema.ts
import { defineSchema } from '@flowrag/core';

export const narrativeSchema = defineSchema({
  entityTypes: ['CHARACTER', 'LOCATION', 'EVENT', 'OBJECT', 'EMOTION'],
  relationTypes: [
    'LOVES', 'HATES', 'KNOWS', 'RELATED_TO', 'FRIENDS_WITH', 'ENEMIES_WITH',
    'LOCATED_IN', 'LIVES_IN', 'TRAVELS_TO',
    'HAPPENS_BEFORE', 'HAPPENS_AFTER', 'CAUSES',
    'OWNS', 'USES', 'SEEKS',
  ],
  documentFields: {
    arc: { type: 'string', filterable: true },
    episode: { type: 'string', filterable: true },
    chapter: { type: 'string', filterable: true },
    pov: { type: 'string', filterable: true },
    location: { type: 'string' },
    outfit: { type: 'string' },
    kink: { type: 'string' },
  },
});
```

### RAG Factory

```typescript
// lib/rag/index.ts
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { narrativeSchema } from './schema.js';
import { EchoesParser } from './parser.js';

export function createEchoesRAG(dbPath: string) {
  return createFlowRAG({
    schema: narrativeSchema,
    ...createLocalStorage(dbPath),
    parsers: [new EchoesParser()],
    // Arc isolation handled per-call via namespace
  });
}
```

### Document Parser

```typescript
// lib/rag/parser.ts
// Custom parser that extracts frontmatter metadata from Echoes .md files
// Maps pov, arc, episode, chapter, location, outfit, kink to DocumentMetadata.fields
// Returns content without frontmatter for indexing
```

---

## Tool Migration Map

### DELETE (replaced by FlowRAG)

| File | LOC | Replacement |
|---|---|---|
| `lib/database/index.ts` | 300 | `@flowrag/storage-*` |
| `lib/database/schemas.ts` | 120 | `@flowrag/core` types |
| `lib/indexer/embeddings.ts` | 100 | `@flowrag/provider-local` |
| `lib/indexer/extractor.ts` | 80 | `@flowrag/provider-gemini` |
| `lib/indexer/scanner.ts` | 80 | `@flowrag/pipeline` (file scanning) |
| `lib/indexer/tasks.ts` | 250 | `@flowrag/pipeline` + listr2 wrapper |
| **Total** | **~930 LOC** | |

### REWRITE (thin wrappers around FlowRAG)

| File | Change |
|---|---|
| `lib/tools/index.ts` | Call `rag.index(contentPath, { namespace: arc })` |
| `lib/tools/search.ts` | Call `rag.search(query, { namespace: arc, mode })` |
| `lib/tools/graph-export.ts` | Call `rag.export(format)`, drop Mermaid (use JSON/DOT only) |
| `lib/tools/list.ts` | Query FlowRAG graph storage for entities/relations |
| `lib/tools/review-generate.ts` | Query FlowRAG graph storage for pending entities |
| `lib/tools/review-apply.ts` | Update FlowRAG graph storage with corrections |
| `lib/tools/review-status.ts` | Query FlowRAG graph storage for review counts |

### KEEP (rewire storage access only)

| File | Change |
|---|---|
| `lib/tools/stats.ts` | Query FlowRAG KV/vector storage for chapter data |
| `lib/tools/history.ts` | Query FlowRAG graph + KV storage |
| `lib/tools/consistency/` | Query FlowRAG storage instead of Database class |
| `lib/tools/words-count.ts` | No changes (standalone) |
| `lib/prompts/` | No changes |
| `lib/server.ts` | No changes (tool registration stays identical) |
| `lib/utils.ts` | No changes |

---

## FlowRAG Enhancements Needed

One feature must be added to FlowRAG before integration. The others originally considered were either already supported or trivially worked around.

### Document metadata propagation to vector records (REQUIRED)

**Problem**: During indexing, FlowRAG stores only `{ documentId, content }` in vector record metadata (`IndexingPipeline.processChunk`). Document-level metadata (custom fields from `DocumentMetadata.fields`) is NOT propagated. After a vector search, results contain `content` and `score` but none of the document's custom fields.

**Impact on Echoes**: Search results must include chapter metadata (pov, episode, chapter, title, location, word_count) which come from frontmatter. Without this, every search would require N additional KV lookups to hydrate results — one per result.

**Fix**: In `IndexingPipeline.processChunk()`, propagate document metadata fields into the vector record:

```typescript
// Current (packages/pipeline/src/indexing/pipeline.ts, ~line 139):
metadata: { documentId: chunk.documentId, content: chunk.content }

// Should become:
metadata: { documentId: chunk.documentId, content: chunk.content, ...documentFields }
```

**Scope**: ~10 lines changed in `@flowrag/pipeline`. The `SearchResult.metadata` type already supports `Record<string, unknown>`, so no type changes needed.

**Tracking**: Implemented in `@flowrag/pipeline@1.8.0`

### Evaluated and NOT needed

| Enhancement | Why not needed |
|---|---|
| No-chunk mode | `chunkSize: Number.MAX_SAFE_INTEGER` produces 1 chunk per document. Works today. |
| Mermaid export | Niche format, DOT/JSON cover all real use cases. Echoes v8 drops Mermaid support. |
| Bulk entity query with arc filter | FlowRAG's `withNamespace()` already provides arc isolation at storage level. |

---

## Database Migration

### Strategy: Clean re-index

Since FlowRAG uses different storage layout (separate KV, Vector, Graph stores vs single LanceDB), a clean re-index is required. This is acceptable because:
- Indexing is idempotent (source of truth is markdown files)
- Users already have `--force` flag
- v7 → v8 is a major version bump

### Migration steps

1. Detect old `metadata.json` format in db directory
2. Print migration message: "v8 requires re-indexing. Run `echoes index --force`"
3. Old LanceDB files can coexist (different directory or auto-cleanup)

---

## Implementation Plan

### Phase 1: FlowRAG enhancement ✅
- [x] Add document metadata propagation to vector records in `@flowrag/pipeline` → `@flowrag/pipeline@1.8.0`
- [x] Release new `@flowrag/pipeline` version

### Phase 2: Integration layer ✅
- [x] Create `lib/rag/schema.ts` with narrative schema
- [x] Create `lib/rag/parser.ts` for frontmatter parsing
- [x] Create `lib/rag/index.ts` factory function
- [x] Tests for integration layer (23 tests)

### Phase 3: Core tool migration ✅
- [x] Rewrite `lib/tools/index.ts` → FlowRAG pipeline
- [x] Rewrite `lib/tools/search.ts` → FlowRAG search + searchEntities + graph queries
- [x] Rewrite `lib/tools/list.ts` → FlowRAG graph queries
- [x] Rewrite `lib/tools/graph-export.ts` → FlowRAG export (JSON/DOT only, drop Mermaid)
- [x] Update `cli/program.ts` → drop Mermaid default
- [ ] Delete `lib/database/` and `lib/indexer/` (after Phase 4-5)
- [ ] Update `lib/constants.ts`
- [x] Tests for all rewritten tools (26 tests)

### Phase 4: Narrative tool rewiring
- [ ] Rewire `lib/tools/stats.ts` to FlowRAG storage
- [ ] Rewire `lib/tools/history.ts` to FlowRAG storage
- [ ] Rewire `lib/tools/consistency/` to FlowRAG storage
- [ ] Tests for all rewired tools

### Phase 5: Review system rewiring
- [ ] Rewire `lib/tools/review-generate.ts` to FlowRAG graph storage
- [ ] Rewire `lib/tools/review-apply.ts` to FlowRAG graph storage
- [ ] Rewire `lib/tools/review-status.ts` to FlowRAG graph storage
- [ ] Tests for review tools

### Phase 6: CLI + progress
- [ ] Update CLI to use FlowRAG pipeline with listr2 progress
- [ ] Verify MCP server works with silent renderer
- [ ] End-to-end test on real timeline

### Phase 7: Cleanup + release
- [ ] Remove unused dependencies (`@google/genai`, `@huggingface/transformers`, `@lancedb/lancedb`, `apache-arrow`, `remove-markdown`)
- [ ] Add FlowRAG dependencies to package.json
- [ ] Update README
- [ ] Update CHANGELOG
- [ ] Bump to v8.0.0 (breaking: requires re-index)

---

## Dependencies Change

### package.json diff

```diff
  "dependencies": {
-   "@google/genai": "^1.34.0",
-   "@huggingface/transformers": "^3.8.1",
-   "@lancedb/lancedb": "^0.23.0",
-   "apache-arrow": "^18.1.0",
-   "remove-markdown": "^0.6.2",
+   "@flowrag/core": "^1.0.0",
+   "@flowrag/pipeline": "^1.0.0",
+   "@flowrag/storage-lancedb": "^1.0.0",
+   "@flowrag/storage-sqlite": "^1.0.0",
+   "@flowrag/storage-json": "^1.0.0",
+   "@flowrag/provider-local": "^1.0.0",
+   "@flowrag/provider-gemini": "^1.0.0",
    "@commander-js/extra-typings": "^14.0.0",
    "@modelcontextprotocol/sdk": "^1.25.1",
    "commander": "^14.0.2",
    "gray-matter": "^4.0.3",
    "listr2": "^9.0.5",
    "zod": "^4.2.1"
  }
```

Note: `@flowrag/storage-lancedb` depends on `@lancedb/lancedb` internally, so LanceDB is still used — just not as a direct dependency.

---

## API Compatibility

### MCP Tools — NO breaking changes

All tool names, parameters, and output formats remain identical:

| Tool | Input schema | Output schema | Change |
|---|---|---|---|
| `words-count` | ✅ Same | ✅ Same | None |
| `index` | ✅ Same | ✅ Same | Internal rewrite |
| `search` | ✅ Same | ✅ Same | Internal rewrite |
| `stats` | ✅ Same | ✅ Same | Storage rewire |
| `list` | ✅ Same | ✅ Same | Storage rewire |
| `graph-export` | ⚠️ Drop `mermaid` format | ✅ Same | Internal rewrite, JSON/DOT only |
| `history` | ✅ Same | ✅ Same | Storage rewire |
| `check-consistency` | ✅ Same | ✅ Same | Storage rewire |
| `review-generate` | ✅ Same | ✅ Same | Storage rewire |
| `review-apply` | ✅ Same | ✅ Same | Storage rewire |
| `review-status` | ✅ Same | ✅ Same | Storage rewire |

### MCP Prompts — NO changes

All prompts remain identical.

### CLI — NO breaking changes

All CLI commands remain identical.

### Breaking Changes

- **Requires re-index**: New storage layout (LanceDB + SQLite + JSON vs LanceDB-only)
- **`graph-export` drops `mermaid` format**: Only `json` and `dot` supported (use JSON for programmatic conversion)
- **Node.js 20+**: Same as before

---

## Quality Standards

- **Test coverage**: Maintain 99%+
- **Type safety**: Strict TypeScript
- **Zero custom RAG code**: All RAG logic delegated to FlowRAG
- **Backward compatible API**: Same MCP tools, prompts, and CLI

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| FlowRAG API changes break Echoes | Pin FlowRAG versions, same author controls both |
| Performance regression with separate storages | Benchmark before/after on real timeline |
| Missing FlowRAG feature blocks migration | Only 1 small enhancement needed (~10 LOC), same author controls both repos |
| Re-index required for users | Clear migration message, `--force` flag already exists |

---

## Success Criteria

- [ ] All 267+ existing tests pass (or equivalent coverage on rewritten code)
- [ ] `echoes index` produces identical knowledge graph as v7
- [ ] `echoes search` returns same quality results
- [ ] ~930 LOC of custom RAG code deleted
- [ ] No direct dependency on `@google/genai`, `@huggingface/transformers`, `@lancedb/lancedb`, `apache-arrow`
- [ ] FlowRAG provider swap works (e.g., switch to OpenAI embeddings by changing config)

---

## References

- [FlowRAG](https://github.com/Zweer/FlowRAG)
- [FlowRAG docs](https://zweer.github.io/FlowRAG/)
- [echoes-mcp-server v7.1.1](https://github.com/echoes-io/mcp-server)
- [LightRAG](https://github.com/HKUDS/LightRAG) — evaluated, not selected (Python, server model)
- [OpenMemory](https://github.com/CaviraOSS/OpenMemory) — evaluated, not selected (different paradigm)
- [Mastra.ai](https://mastra.ai) — evaluated, not selected (framework lock-in)
