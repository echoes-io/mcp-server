import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import type { ToolConfig } from '../types.js';

export const historyConfig: ToolConfig = {
  name: 'history',
  description: 'Query character/arc history (kinks, outfits, locations, relations).',
  arguments: {
    arc: 'Arc name to analyze.',
    character: 'Filter by POV character (optional).',
    only: 'Filter by type: kinks, outfits, locations, or relations (optional).',
    search: 'Search term across all fields (optional).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const historySchema = z.object({
  arc: z.string().min(1).describe(historyConfig.arguments.arc),
  character: z.string().optional().describe(historyConfig.arguments.character),
  only: z
    .enum(['kinks', 'outfits', 'locations', 'relations'])
    .optional()
    .describe(historyConfig.arguments.only),
  search: z.string().optional().describe(historyConfig.arguments.search),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(historyConfig.arguments.dbPath),
});

export type HistoryInput = z.infer<typeof historySchema>;

interface KinkEntry {
  chapter: string;
  kink: string;
  isFirst: boolean;
}
interface OutfitEntry {
  chapter: string;
  character: string;
  outfit: string;
}
interface LocationEntry {
  chapter: string;
  location: string;
}
interface RelationEntry {
  chapter: string;
  source: string;
  target: string;
  type: string;
}

interface HistoryResult {
  arc: string;
  character?: string;
  kinks: KinkEntry[];
  outfits: OutfitEntry[];
  locations: LocationEntry[];
  relations: RelationEntry[];
}

function parseOutfitField(outfitField: string): Array<{ character: string; outfit: string }> {
  if (!outfitField) return [];
  return outfitField
    .split('|')
    .map((part) => {
      const [character, outfit] = part.split(':').map((s) => s.trim());
      return { character: character || '', outfit: outfit || '' };
    })
    .filter((entry) => entry.character && entry.outfit);
}

function isFirstTimeKink(kink: string): boolean {
  return /\b(primo|prima|first)\b/i.test(kink);
}

function matchesSearch(text: string, search: string): boolean {
  return text.toLowerCase().includes(search.toLowerCase());
}

export async function history(input: HistoryInput): Promise<HistoryResult> {
  const { arc, character, only, search, dbPath } = historySchema.parse(input);

  const { storage } = createEchoesRAG({ dbPath, arc });

  const result: HistoryResult = {
    arc,
    character,
    kinks: [],
    outfits: [],
    locations: [],
    relations: [],
  };

  // Get chapter data from KV
  const docKeys = await storage.kv.list('doc:');
  for (const key of docKeys) {
    const doc = await storage.kv.get<{ metadata?: { fields?: Record<string, unknown> } }>(key);
    const f = doc?.metadata?.fields;
    if (!f) continue;

    if (character && String(f.pov ?? '') !== character) continue;

    const chapterKey = `ep${String(f.episode ?? '0').padStart(2, '0')}:ch${String(f.chapter ?? '0').padStart(3, '0')}`;

    if (f.kink && (!only || only === 'kinks')) {
      const kinks = String(f.kink)
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean);
      for (const kink of kinks) {
        if (!search || matchesSearch(kink, search)) {
          result.kinks.push({ chapter: chapterKey, kink, isFirst: isFirstTimeKink(kink) });
        }
      }
    }

    if (f.outfit && (!only || only === 'outfits')) {
      for (const { character: c, outfit } of parseOutfitField(String(f.outfit))) {
        if (!search || matchesSearch(`${c}: ${outfit}`, search)) {
          result.outfits.push({ chapter: chapterKey, character: c, outfit });
        }
      }
    }

    if (f.location && (!only || only === 'locations')) {
      const loc = String(f.location);
      if (!search || matchesSearch(loc, search)) {
        result.locations.push({ chapter: chapterKey, location: loc });
      }
    }
  }

  // Get relations from graph
  if (!only || only === 'relations') {
    const entities = await storage.graph.getEntities();
    const seen = new Set<string>();
    for (const entity of entities) {
      const rels = await storage.graph.getRelations(entity.id, 'out');
      for (const rel of rels) {
        if (seen.has(rel.id)) continue;
        seen.add(rel.id);
        const text = `${rel.sourceId} ${rel.type} ${rel.targetId}`;
        if (search && !matchesSearch(text, search)) continue;
        const firstChunk = rel.sourceChunkIds[0];
        if (firstChunk) {
          const parts = firstChunk.split(':');
          const chapterKey = `ep${parts[1] ?? '0'}:ch${parts[2] ?? '0'}`;
          result.relations.push({
            chapter: chapterKey,
            source: rel.sourceId,
            target: rel.targetId,
            type: rel.type,
          });
        }
      }
    }
  }

  const sortByChapter = (a: { chapter: string }, b: { chapter: string }) =>
    a.chapter.localeCompare(b.chapter);
  result.kinks.sort(sortByChapter);
  result.outfits.sort(sortByChapter);
  result.locations.sort(sortByChapter);
  result.relations.sort(sortByChapter);

  return result;
}
