import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { Database } from '../database/index.js';
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

  // Parse "Nic: Business casual | Vi: Outfit professionale"
  return outfitField
    .split('|')
    .map((part) => {
      const [character, outfit] = part.split(':').map((s) => s.trim());
      return { character: character || '', outfit: outfit || '' };
    })
    .filter((entry) => entry.character && entry.outfit);
}

function isFirstTimeKink(kink: string): boolean {
  const firstPatterns = /\b(primo|prima|first)\b/i;
  return firstPatterns.test(kink);
}

function matchesSearch(text: string, search: string): boolean {
  return text.toLowerCase().includes(search.toLowerCase());
}

export async function history(input: HistoryInput): Promise<HistoryResult> {
  const { arc, character, only, search, dbPath } = historySchema.parse(input);

  const db = new Database(dbPath);
  await db.connect();

  // Get all chapters for the arc
  const chapters = await db.getChapters(arc);

  // Get relations for the arc
  const relations = await db.getRelations(arc);

  db.close();

  const result: HistoryResult = {
    arc,
    character,
    kinks: [],
    outfits: [],
    locations: [],
    relations: [],
  };

  // Process chapters for kinks, outfits, and locations
  for (const chapter of chapters) {
    // Filter by character if specified
    if (character && chapter.pov !== character) continue;

    const chapterKey = `ep${chapter.episode.toString().padStart(2, '0')}:ch${chapter.chapter.toString().padStart(3, '0')}`;

    // Process kinks (from chapter.kink field if available, otherwise skip)
    if ((chapter as any).kink && (!only || only === 'kinks')) {
      const kinks = (chapter as any).kink
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k);
      for (const kink of kinks) {
        if (!search || matchesSearch(kink, search)) {
          result.kinks.push({
            chapter: chapterKey,
            kink,
            isFirst: isFirstTimeKink(kink),
          });
        }
      }
    }

    // Process outfits (from chapter.outfit field if available, otherwise skip)
    if ((chapter as any).outfit && (!only || only === 'outfits')) {
      const outfits = parseOutfitField((chapter as any).outfit);
      for (const { character: outfitChar, outfit } of outfits) {
        if (!search || matchesSearch(`${outfitChar}: ${outfit}`, search)) {
          result.outfits.push({
            chapter: chapterKey,
            character: outfitChar,
            outfit,
          });
        }
      }
    }

    // Process locations
    if (chapter.location && (!only || only === 'locations')) {
      if (!search || matchesSearch(chapter.location, search)) {
        result.locations.push({
          chapter: chapterKey,
          location: chapter.location,
        });
      }
    }
  }

  // Process relations
  if (!only || only === 'relations') {
    for (const relation of relations) {
      const relationText = `${relation.source_entity} ${relation.type} ${relation.target_entity}`;
      if (!search || matchesSearch(relationText, search)) {
        // Find first chapter where this relation appears
        const firstChapter = relation.chapters[0];
        if (firstChapter) {
          const [, episode, chapter] = firstChapter.split(':');
          const chapterKey = `ep${episode}:ch${chapter}`;

          result.relations.push({
            chapter: chapterKey,
            source: relation.source_entity.split(':').pop() || '',
            target: relation.target_entity.split(':').pop() || '',
            type: relation.type,
          });
        }
      }
    }
  }

  // Sort all entries by chapter
  const sortByChapter = (a: { chapter: string }, b: { chapter: string }) =>
    a.chapter.localeCompare(b.chapter);

  result.kinks.sort(sortByChapter);
  result.outfits.sort(sortByChapter);
  result.locations.sort(sortByChapter);
  result.relations.sort(sortByChapter);

  return result;
}
