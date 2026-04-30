import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import matter from 'gray-matter';
import z from 'zod';

import type { ToolConfig } from '../types.js';
import { parseChapter } from '../utils.js';

const STALLED_DAYS = 30;
const OUTLINED_AVG_WORDS = 500;

export const timelineOverviewConfig: ToolConfig = {
  name: 'timeline-overview',
  description:
    'Quick overview of all arcs in a timeline: status, chapters, words, POVs, last modified.',
  arguments: {
    contentPath: 'Path to the content directory.',
  },
};

export const timelineOverviewSchema = z.object({
  contentPath: z
    .string()
    .default('./content')
    .describe(timelineOverviewConfig.arguments.contentPath),
});

export type TimelineOverviewInput = z.infer<typeof timelineOverviewSchema>;
export type Status = 'planned' | 'active' | 'hiatus' | 'complete';

const VALID_STATUSES = new Set<Status>(['planned', 'active', 'hiatus', 'complete']);

export interface EpisodeOverview {
  name: string;
  status: Status;
  chapters: number;
  plannedChapters: number | null;
  words: number;
  avgWordsPerChapter: number;
  lastModified: string | null;
}

export interface ArcOverview {
  name: string;
  status: Status;
  episodes: EpisodeOverview[];
  chapters: number;
  words: number;
  avgWordsPerChapter: number;
  povs: string[];
  lastModified: string | null;
}

export interface TimelineOverviewOutput {
  arcs: ArcOverview[];
  totals: {
    arcs: number;
    episodes: number;
    chapters: number;
    plannedChapters: number | null;
    words: number;
  };
}

// --- Helpers ---

interface EpisodeScan {
  chapters: number;
  words: number;
  lastModified: Date | null;
  povs: Set<string>;
}

function scanFiles(filePaths: string[]): EpisodeScan {
  const result: EpisodeScan = { chapters: 0, words: 0, lastModified: null, povs: new Set() };

  for (const filePath of filePaths) {
    result.chapters++;
    const mtime = statSync(filePath).mtime;
    if (result.lastModified === null || mtime > result.lastModified) result.lastModified = mtime;

    try {
      const parsed = parseChapter(readFileSync(filePath, 'utf-8'));
      result.words += parsed.stats.wordCount;
      const pov = parsed.metadata.pov?.toLowerCase();
      if (pov) result.povs.add(pov);
    } catch {
      const raw = readFileSync(filePath, 'utf-8');
      const end = raw.indexOf('---', 3);
      const body = end > 0 ? raw.slice(raw.indexOf('\n', end) + 1) : raw;
      result.words += body.split(/\s+/).filter((w) => w.length > 0).length;
    }
  }

  return result;
}

function inferStatus(chapters: number, avgWords: number, lastModified: Date | null): Status {
  if (chapters === 0 || avgWords < OUTLINED_AVG_WORDS) return 'planned';
  if (lastModified && Date.now() - lastModified.getTime() > STALLED_DAYS * 86_400_000)
    return 'hiatus';
  return 'active';
}

function isOld(name: string): boolean {
  return name.includes('-old-') || name.startsWith('old-');
}

function isVariant(filename: string): boolean {
  return /-(?:audit|v\d+)(?:-.+)?\.md$/.test(filename);
}

function readFrontmatter(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    return matter(readFileSync(filePath, 'utf-8')).data;
  } catch {
    return {};
  }
}

interface OutlineInfo {
  epName: string;
  plannedChapters: number | null;
}

function loadOutlines(contentPath: string): Map<string, OutlineInfo[]> {
  const docsPath = join(contentPath, '..', 'docs', 'episodes');
  if (!existsSync(docsPath)) return new Map();

  const result = new Map<string, OutlineInfo[]>();

  for (const file of readdirSync(docsPath).filter((f) => f.endsWith('.md'))) {
    if (isVariant(file)) continue;
    const match = file.match(/^([^-]+)-(ep\d+)-(.+)\.md$/);
    if (!match) continue;

    const [, arc, epNum, slug] = match;
    const data = readFrontmatter(join(docsPath, file));
    const info: OutlineInfo = {
      epName: `${epNum}-${slug}`,
      plannedChapters: typeof data.chapters === 'number' ? data.chapters : null,
    };

    if (!result.has(arc)) result.set(arc, []);
    result.get(arc)?.push(info);
  }

  return result;
}

// --- Core ---

function listChapterFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => join(dir, f));
}

function buildEpisode(
  name: string,
  scan: EpisodeScan,
  outline: OutlineInfo | undefined,
  statusOverride: Status | null,
): EpisodeOverview {
  const avg = scan.chapters > 0 ? scan.words / scan.chapters : 0;
  return {
    name,
    status: statusOverride ?? inferStatus(scan.chapters, avg, scan.lastModified),
    chapters: scan.chapters,
    plannedChapters: outline?.plannedChapters ?? null,
    words: scan.words,
    avgWordsPerChapter: scan.chapters > 0 ? Math.round(avg) : 0,
    lastModified: scan.lastModified?.toISOString().split('T')[0] ?? null,
  };
}

function resolveEpisodeStatus(
  epName: string,
  readme: { status: Status | null; episodes: Record<string, Status> },
): Status | null {
  return readme.episodes[epName] ?? (readme.status === 'complete' ? 'complete' : null);
}

export function timelineOverview(input: TimelineOverviewInput): TimelineOverviewOutput {
  const { contentPath } = timelineOverviewSchema.parse(input);
  const outlines = loadOutlines(contentPath);

  const arcDirs = readdirSync(contentPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const arcs: ArcOverview[] = [];
  let totalEpisodes = 0;
  let totalChapters = 0;
  let totalPlanned = 0;
  let hasPlanned = false;
  let totalWords = 0;

  for (const arcName of arcDirs) {
    const arcPath = join(contentPath, arcName);
    const readmeData = readFrontmatter(join(arcPath, 'README.md'));
    const readme = {
      status: VALID_STATUSES.has(readmeData.status as Status)
        ? (readmeData.status as Status)
        : null,
      episodes: Object.fromEntries(
        Object.entries((readmeData.episodes ?? {}) as Record<string, string>).filter(([, s]) =>
          VALID_STATUSES.has(s as Status),
        ),
      ) as Record<string, Status>,
    };

    const arcOutlines = outlines.get(arcName) ?? [];
    const epDirs = readdirSync(arcPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !isOld(d.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const episodes: EpisodeOverview[] = [];
    const seenEpNames = new Set<string>();
    let arcWords = 0;
    let arcChapters = 0;
    let arcLastModified: Date | null = null;
    const arcPovs = new Set<string>();

    for (const epDir of epDirs) {
      seenEpNames.add(epDir.name);
      const scan = scanFiles(listChapterFiles(join(arcPath, epDir.name)));
      const outline = arcOutlines.find((o) => o.epName === epDir.name);
      const ep = buildEpisode(epDir.name, scan, outline, resolveEpisodeStatus(epDir.name, readme));

      episodes.push(ep);
      arcWords += scan.words;
      arcChapters += scan.chapters;
      for (const p of scan.povs) arcPovs.add(p);
      if (scan.lastModified && (arcLastModified === null || scan.lastModified > arcLastModified))
        arcLastModified = scan.lastModified;
    }

    // Add planned episodes from outlines not yet in content
    for (const outline of arcOutlines.sort((a, b) => a.epName.localeCompare(b.epName))) {
      if (seenEpNames.has(outline.epName)) continue;
      const empty: EpisodeScan = { chapters: 0, words: 0, lastModified: null, povs: new Set() };
      episodes.push(buildEpisode(outline.epName, empty, outline, 'planned'));
    }

    // Accumulate totals
    totalEpisodes += episodes.length;
    totalChapters += arcChapters;
    totalWords += arcWords;
    for (const ep of episodes) {
      if (ep.plannedChapters != null) {
        totalPlanned += ep.plannedChapters;
        hasPlanned = true;
      } else {
        totalPlanned += ep.chapters;
      }
    }

    const avgWords = arcChapters > 0 ? arcWords / arcChapters : 0;
    arcs.push({
      name: arcName,
      status: readme.status ?? inferStatus(arcChapters, avgWords, arcLastModified),
      episodes,
      chapters: arcChapters,
      words: arcWords,
      avgWordsPerChapter: arcChapters > 0 ? Math.round(avgWords) : 0,
      povs: [...arcPovs].sort(),
      lastModified: arcLastModified?.toISOString().split('T')[0] ?? null,
    });
  }

  return {
    arcs,
    totals: {
      arcs: arcs.length,
      episodes: totalEpisodes,
      chapters: totalChapters,
      plannedChapters: hasPlanned ? totalPlanned : null,
      words: totalWords,
    },
  };
}
