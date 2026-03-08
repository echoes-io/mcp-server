# Entity embedding and semantic entity search

## Problem

FlowRAG currently embeds document chunks and stores them in vector storage for semantic search. However, entities extracted into the knowledge graph are never embedded — they only live in GraphStorage as structured data.

This means there's no way to do semantic search on entities. If a user wants to find "the character who lives in the castle", they can only:
1. Do a vector search on chunks (which returns document fragments, not entities)
2. Do an exact match on `graph.getEntities({ name: '...' })` (which requires knowing the exact name)

There's no middle ground — no way to semantically search the knowledge graph itself.

## Proposed feature

### 1. Embed entities during indexing

After the indexing pipeline has processed all chunks and entities are stored in GraphStorage, generate an embedding for each entity and store it in VectorStorage.

The embedding text would be a concatenation of the entity's key fields:
```
{name}: {description}
```

Vector records for entities would be distinguishable from chunk vectors via a metadata field:

```typescript
await storage.vector.upsert([{
  id: `entity:${entity.id}`,
  vector: embedding,
  metadata: {
    _kind: 'entity',
    entityId: entity.id,
    name: entity.name,
    type: entity.type,
    description: entity.description,
  },
}]);
```

### 2. Add `searchEntities()` to FlowRAG interface

```typescript
interface FlowRAG {
  // existing...
  searchEntities(query: string, options?: {
    limit?: number;
    filter?: EntityFilter;
  }): Promise<EntitySearchResult[]>;
}

interface EntitySearchResult {
  entity: Entity;
  score: number;
}
```

Implementation: embed the query, do a vector search with `_kind: 'entity'` filter, hydrate results from GraphStorage.

### 3. Re-embed on entity merge

When `mergeEntities()` is called, the merged entity should get a new embedding reflecting its updated name/description. Old entity vectors should be deleted.

## Use case

A narrative knowledge graph where users search for characters, locations, or events by description rather than exact name:

- "the girl with red hair" → finds CHARACTER entity "Alice" (description mentions red hair)
- "the restaurant in Milan" → finds LOCATION entity "Da Marco" 
- "the first meeting" → finds EVENT entity "Primo Incontro"

This is fundamentally different from chunk search — the user wants the entity itself (structured data with type, description, relations), not a document fragment.

## Alternatives considered

1. **Text match on `getEntities()`**: Works for exact/partial name matches, but misses semantic similarity. "the girl with red hair" would never match "Alice".
2. **Search chunks, then extract entity references**: Indirect, noisy, and requires post-processing to deduplicate and resolve entity references back to graph nodes.
3. **Consumer-side embedding**: Each consumer implements their own entity embedding loop outside FlowRAG. Duplicates logic and misses the indexing lifecycle (new entities from re-indexing, merges, deletions).

## Scope estimate

- `IndexingPipeline`: add post-processing step to embed entities after all chunks are done (~30 LOC)
- `QueryPipeline`: add `searchEntities()` method (~20 LOC)
- `createFlowRAG`: expose `searchEntities()` on the FlowRAG interface (~10 LOC)
- `mergeEntities`: re-embed merged entity, delete old vectors (~10 LOC)
- Tests: ~50 LOC
