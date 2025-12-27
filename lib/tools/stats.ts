import z from 'zod';

import { Database, DEFAULT_DB_PATH } from '../database/index.js';
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

function parseFilter(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((v) => v.trim().toLowerCase());
}

export async function stats(input: StatsInput): Promise<StatsOutput> {
  const { arc, pov, dbPath } = statsSchema.parse(input);
  const arcFilter = parseFilter(arc);
  const povFilter = parseFilter(pov);

  const db = new Database(dbPath);
  let chapters = await db.getChapters();
  db.close();

  if (chapters.length === 0) {
    throw new Error('No indexed chapters found. Run "index" first.');
  }

  // Normalize POV to lowercase for comparison
  chapters = chapters.map((c) => ({ ...c, pov: c.pov.toLowerCase() }));

  if (arcFilter) {
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
