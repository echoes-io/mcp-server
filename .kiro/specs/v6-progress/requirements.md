# Echoes MCP Server - Progress Reporting

## Problem Statement

The `index` command can take 30+ minutes for large timelines (500+ chapters). Currently there's no progress feedback, making it impossible to know:
- How far along the process is
- How much time remains
- What's currently happening
- If the process is stuck

Additionally, **MCP server must remain silent** - any stdout/stderr output would crash the JSON-RPC protocol.

---

## Requirements

### Functional Requirements

1. **Task-based progress**: Display indexing as a series of tasks with clear states
2. **Silent mode for MCP**: Use `SilentRenderer` when running as MCP server
3. **Granular progress**: Show progress at multiple levels:
   - Overall phase (scanning → processing → saving)
   - Per-chapter progress with current operation
   - Running totals (entities found, relations found)
4. **Time tracking**: Show elapsed time and ETA
5. **Graceful cancellation**: Support Ctrl+C with clean shutdown

### Non-Functional Requirements

1. **No breaking changes**: Existing `index()` API remains compatible
2. **Testable**: Use `TestRenderer` for unit tests
3. **Update per file**: Report progress for every chapter processed

---

## Architecture

### Library Choice: listr2

**Why listr2 over cli-progress:**

| Aspect | cli-progress | listr2 |
|--------|--------------|--------|
| Paradigm | Progress bars | Task list with states |
| Subtasks | Manual multi-bar | Native nesting |
| States | Only % | pending/running/done/failed |
| Cancellation | Manual | Built-in with rollback |
| MCP compatibility | Manual suppress | `SilentRenderer` |
| Size | ~50KB | ~200KB |

listr2 is better because:
- Indexing has distinct phases (scan → process → save), not just "a bar advancing"
- Subtasks are natural for showing "embedding..." under current chapter
- Clear states (✔/⠋/✖) communicate better than percentages
- Built-in cancellation support
- `SilentRenderer` for MCP, `TestRenderer` for tests

### CLI Output Design

Hybrid approach: listr2 for task states + inline progress bar via `task.output`:

```
✔ Scanning filesystem (found 500 chapters, 312 to index)
⠋ Processing chapters
  └─ [████████████░░░░░░░░░░░░░░░░░░] 127/312 (41%) | ETA: 22m
     bloom:ep01:ch127 - Extracting entities...
     👤 47 entities | 🔗 123 relations
◯ Generating entity embeddings
◯ Saving to database
```

The progress bar and counters update in real-time because `task.output` is rewritten on each chapter.

### On Completion

```
✔ Scanning filesystem (found 500 chapters, 312 to index) [1s]
✔ Processing chapters (312 chapters) [18m 26s]
  └─ 👤 47 entities | 🔗 123 relations
✔ Generating entity embeddings (47 entities) [2m 15s]
✔ Saving to database [1s]

📊 Summary
   📖 Indexed:   312 chapters
   ⏭️  Skipped:   188 chapters (unchanged)
   🗑️  Deleted:   0 chapters
   👤 Entities:  47
   🔗 Relations: 123
   ⏱️  Total:     21m 42s
```

### Progress Bar Helper

```typescript
function formatProgressBar(current: number, total: number, width = 30): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${current}/${total} (${Math.round(pct * 100)}%)`;
}

function formatEta(startTime: number, current: number, total: number): string {
  if (current === 0) return 'calculating...';
  const elapsed = Date.now() - startTime;
  const msPerItem = elapsed / current;
  const remaining = msPerItem * (total - current);
  const minutes = Math.ceil(remaining / 60000);
  return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}
```

### Task Output Update

```typescript
{
  title: 'Processing chapters',
  task: async (ctx, task) => {
    const startTime = Date.now();
    
    for (let i = 0; i < ctx.toIndex.length; i++) {
      const chapter = ctx.toIndex[i];
      const bar = formatProgressBar(i + 1, ctx.toIndex.length);
      const eta = formatEta(startTime, i + 1, ctx.toIndex.length);
      
      // Update output with progress bar + current chapter + counters
      task.output = `${bar} | ETA: ${eta}\n` +
        `${chapter.id} - Generating embedding...\n` +
        `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;
      
      // Process chapter...
      await generateEmbedding(chapter);
      
      task.output = `${bar} | ETA: ${eta}\n` +
        `${chapter.id} - Extracting entities...\n` +
        `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;
      
      await extractEntities(chapter);
    }
    
    // Final title update
    task.title = `Processing chapters (${ctx.toIndex.length} chapters)`;
    task.output = `👤 ${ctx.entities.size} entities | 🔗 ${ctx.relations.size} relations`;
  }
}

### Code Structure

The indexing logic moves to a dedicated module that uses listr2:

```typescript
// lib/indexer/index.ts
import { Listr } from 'listr2';

interface IndexContext {
  contentPath: string;
  arc?: string;
  force: boolean;
  dbPath: string;
  // Results
  scanned: ScannedChapter[];
  toIndex: ScannedChapter[];
  entities: Map<string, EntityRecord>;
  relations: Map<string, RelationRecord>;
  deleted: string[];
}

export function createIndexTasks(input: IndexInput): Listr<IndexContext> {
  return new Listr<IndexContext>([
    {
      title: 'Scanning filesystem',
      task: async (ctx, task) => {
        const { chapters } = scanTimeline(ctx.contentPath, ctx.arc);
        ctx.scanned = chapters;
        // ... determine toIndex
        task.title = `Scanning filesystem (found ${chapters.length} chapters, ${ctx.toIndex.length} to index)`;
      }
    },
    {
      title: 'Processing chapters',
      task: (ctx, task) => task.newListr(
        ctx.toIndex.map((chapter, i) => ({
          title: chapter.id,
          task: (_, subtask) => subtask.newListr([
            {
              title: 'Generating embedding',
              task: async () => { /* ... */ }
            },
            {
              title: 'Extracting entities',
              task: async () => { /* ... */ }
            }
          ], { concurrent: false })
        })),
        { concurrent: false }
      )
    },
    {
      title: 'Generating entity embeddings',
      task: async (ctx, task) => {
        task.title = `Generating entity embeddings (${ctx.entities.size} entities)`;
        // ...
      }
    },
    {
      title: 'Saving to database',
      task: async (ctx) => { /* ... */ }
    }
  ], {
    concurrent: false,
    rendererOptions: { 
      collapseSubtasks: false,
      showTimer: true 
    }
  });
}
```

### MCP Integration

```typescript
// lib/tools/index.ts
import { createIndexTasks } from '../indexer/index.js';

export async function index(input: IndexInput): Promise<IndexOutput> {
  const tasks = createIndexTasks(input);
  
  // Silent renderer for MCP (no stdout)
  const ctx = await tasks.run(undefined, { 
    renderer: 'silent' 
  });
  
  return {
    indexed: ctx.toIndex.length,
    skipped: ctx.scanned.length - ctx.toIndex.length,
    deleted: ctx.deleted.length,
    entities: ctx.entities.size,
    relations: ctx.relations.size,
  };
}
```

### CLI Integration

```typescript
// cli/program.ts
import { createIndexTasks } from '../lib/indexer/index.js';

program
  .command('index')
  .argument('<contentPath>')
  .option('--force')
  .action(async (contentPath, { force, db, arc }) => {
    const tasks = createIndexTasks({ contentPath, arc, force, dbPath: db });
    
    // Default renderer with timer
    const ctx = await tasks.run(undefined, {
      rendererOptions: { showTimer: true }
    });
    
    console.log('\n📊 Summary');
    console.log(`   📖 Indexed:   ${ctx.toIndex.length} chapters`);
    // ...
  });
```

### Testing

```typescript
// test/indexer/index.test.ts
import { createIndexTasks } from '../../lib/indexer/index.js';

it('should index chapters', async () => {
  const tasks = createIndexTasks({ contentPath: './fixtures', dbPath: ':memory:' });
  
  // TestRenderer captures output without displaying
  const ctx = await tasks.run(undefined, { renderer: 'test' });
  
  expect(ctx.toIndex.length).toBe(3);
  expect(ctx.entities.size).toBeGreaterThan(0);
});
```

---

## Implementation Plan

### Phase 1: Refactor to listr2
- [x] Add `listr2` dependency (already present)
- [x] Create `lib/indexer/tasks.ts` with task definitions
- [x] Move indexing logic from `lib/tools/index.ts` to tasks
- [x] Keep `index()` function as thin wrapper with silent renderer

### Phase 2: CLI Integration
- [x] Update `cli/program.ts` to use default renderer
- [x] Add timer display via PRESET_TIMER
- [x] Add summary output on completion

### Phase 3: Cancellation
- [x] Handle SIGINT gracefully
- [x] Close database connection on cancel
- [x] Return partial results on cancellation

### Phase 4: Testing
- [x] Unit tests with silent renderer
- [x] Verify MCP server uses silent renderer
- [x] All 184 tests passing

---

## Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `listr2` | Task list with progress | ~200KB |

---

## Decisions

1. **Update per file**: Yes, report progress for every chapter (no throttling needed)
2. **Cancellation**: Yes, support Ctrl+C with graceful shutdown
3. **Verbosity**: No `--verbose` flag needed, listr2 handles detail levels

---

## References

- [listr2 documentation](https://listr2.kilic.dev)
- [listr2 GitHub](https://github.com/listr2/listr2)
- [MCP Protocol](https://modelcontextprotocol.io/)
