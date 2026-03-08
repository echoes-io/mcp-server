import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import type { ToolConfig } from '../types.js';

export const statsConfig: ToolConfig = {
  name: 'stats',
  description: 'Get aggregate statistics for indexed timeline content.',
  arguments: {
    arc: 'Filter by arc name(s), comma-separated (optional).',
    pov: 'Filter by POV character(s), comma-separated (optional).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const statsSchema = z.object({
  arc: z.string().optional().describe(statsConfig.arguments.arc),
  pov: z.string().optional().describe(statsConfig.arguments.pov),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(statsConfig.arguments.dbPath),
});

export type StatsInput = z.infer<typeof statsSchema>;

export interface StatsOutput {
  totalChapters: number;
  totalWords: number;
  arcs: string[];
  povs: Record<string, number>;
  averageWordsPerChapter: number;
}

interface ChapterMeta {
  arc: string;
  pov: string;
  word_count: number;
}

function parseFilter(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((v) => v.trim().toLowerCase());
}

async function getChapterMetas(dbPath: string, arc?: string): Promise<ChapterMeta[]> {
  const { storage } = createEchoesRAG({ dbPath, arc });
  const metas: ChapterMeta[] = [];

  if (arc) {
    // Namespaced: keys are already stripped of prefix
    const keys = await storage.kv.list('doc:');
    for (const key of keys) {
      const doc = await storage.kv.get<{ metadata?: { fields?: Record<string, unknown> } }>(key);
      const fields = doc?.metadata?.fields;
      if (!fields) continue;
      metas.push({
        arc,
        pov: String(fields.pov ?? '').toLowerCase(),
        word_count: Number(fields.word_count ?? 0),
      });
    }
  } else {
    // Non-namespaced: keys have arc prefix like "bloom:doc:..."
    const keys = await storage.kv.list();
    for (const key of keys) {
      if (!key.includes(':doc:')) continue;
      const doc = await storage.kv.get<{ metadata?: { fields?: Record<string, unknown> } }>(key);
      const fields = doc?.metadata?.fields;
      if (!fields) continue;
      metas.push({
        arc: String(fields.arc ?? key.split(':')[0]),
        pov: String(fields.pov ?? '').toLowerCase(),
        word_count: Number(fields.word_count ?? 0),
      });
    }
  }

  return metas;
}

export async function stats(input: StatsInput): Promise<StatsOutput> {
  const { arc, pov, dbPath } = statsSchema.parse(input);
  const arcFilter = parseFilter(arc);
  const povFilter = parseFilter(pov);

  let chapters = await getChapterMetas(dbPath, arcFilter?.length === 1 ? arcFilter[0] : undefined);

  if (chapters.length === 0 && arcFilter) {
    throw new Error(`No chapters found for arc "${arc}".`);
  }

  if (chapters.length === 0) {
    throw new Error('No indexed chapters found. Run "index" first.');
  }

  if (arcFilter && arcFilter.length > 1) {
    chapters = chapters.filter((c) => arcFilter.includes(c.arc.toLowerCase()));
    if (chapters.length === 0) {
      throw new Error(`No chapters found for arc "${arc}".`);
    }
  }

  if (povFilter) {
    chapters = chapters.filter((c) => povFilter.includes(c.pov));
    if (chapters.length === 0) {
      throw new Error(`No chapters found for POV "${pov}".`);
    }
  }

  const arcs = [...new Set(chapters.map((c) => c.arc))].sort();
  const povs: Record<string, number> = {};
  let totalWords = 0;

  for (const chapter of chapters) {
    totalWords += chapter.word_count;
    povs[chapter.pov] = (povs[chapter.pov] || 0) + 1;
  }

  return {
    totalChapters: chapters.length,
    totalWords,
    arcs,
    povs,
    averageWordsPerChapter: Math.round(totalWords / chapters.length),
  };
}
