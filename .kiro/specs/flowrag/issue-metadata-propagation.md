# Propagate document metadata fields to vector records during indexing

## Problem

When `IndexingPipeline` processes a chunk, it stores the vector record with only `documentId` and `content` in metadata:

```typescript
// packages/pipeline/src/indexing/pipeline.ts, processChunk(), ~line 139
await this.config.storage.vector.upsert([{
  id: chunk.id,
  vector: embedding,
  metadata: { documentId: chunk.documentId, content: chunk.content },
}]);
```

This means that after a vector search, `SearchResult.metadata` only contains `{ documentId, content }`. Any custom fields from `DocumentMetadata.fields` are lost.

## Why this matters

Consumers that store domain-specific metadata on documents (via `DocumentMetadata.fields` or custom parsers) expect that metadata to be available in search results without additional lookups.

Concrete example: a document parser extracts structured metadata from files:

```typescript
// Custom parser returns:
{
  id: 'doc:chapter-42',
  content: '...',
  metadata: {
    filePath: './content/ep01/ch042.md',
    title: 'The Meeting',
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: {
      author: 'Alice',
      episode: 1,
      chapter: 42,
      location: 'Rome',
    }
  }
}
```

After indexing and searching, the result's `metadata` is:

```typescript
// Current: only documentId and content
{ documentId: 'doc:chapter-42', content: '...' }

// Expected: document fields included
{ documentId: 'doc:chapter-42', content: '...', author: 'Alice', episode: 1, chapter: 42, location: 'Rome' }
```

Without this, every search requires N additional `kv.get()` calls to hydrate results with document metadata — one per result.

## Proposed solution

In `IndexingPipeline.processChunk()`, look up the document from KV storage (it's already stored earlier in `processDocument`) and spread its metadata fields into the vector record:

```typescript
// In processChunk, after generating embedding:
const document = await this.config.storage.kv.get<Document>(chunk.documentId);
const documentFields = document?.metadata?.fields ?? {};

await this.config.storage.vector.upsert([{
  id: chunk.id,
  vector: embedding,
  metadata: {
    documentId: chunk.documentId,
    content: chunk.content,
    ...documentFields,
  },
}]);
```

### Considerations

- **No type changes needed**: `VectorRecord.metadata` is already `Record<string, unknown>`, and `SearchResult.metadata` is already `Record<string, unknown>`. The data flows through naturally.
- **No breaking changes**: Existing consumers that don't use `fields` get the same behavior (empty spread). Consumers that do use `fields` get them for free in search results.
- **Performance**: The document is already in KV storage from the `processDocument` step. This is a single KV read per chunk, cached by most storage backends.
- **Multi-chunk documents**: All chunks from the same document get the same metadata fields, which is the expected behavior (the metadata describes the document, not the chunk).

## Alternatives considered

1. **Hydrate in QueryPipeline**: After vector search, do `kv.get()` for each result to fetch document metadata. Works but adds N round-trips per search and pushes the complexity to every consumer.
2. **Store full document in vector metadata**: Too heavy — would duplicate the entire document content in metadata alongside the chunk content.
3. **Only store `fields`**: This is the proposed approach — lightweight, only the structured metadata the user explicitly defined.
