import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import z from 'zod';

import type { ToolConfig } from '../types.js';
import { parseChapter } from '../utils.js';

export const arcResumeConfig: ToolConfig = {
  name: 'arc-resume',
  description:
    'Load complete context for resuming work on an arc: episode outline, character sheets, and recent chapters.',
  arguments: {
    arc: 'Arc name (e.g., "cri", "ale", "gio").',
    episode: 'Episode number (optional - defaults to latest episode).',
    lastChapters: 'Number of recent chapters to include (default: 3).',
    contentPath: 'Path to content directory (default: ./content).',
    docsPath: 'Path to docs directory (default: ./docs).',
  },
};

export const arcResumeSchema = z.object({
  arc: z.string().describe(arcResumeConfig.arguments.arc),
  episode: z.number().optional().describe(arcResumeConfig.arguments.episode),
  lastChapters: z.number().optional().describe(arcResumeConfig.arguments.lastChapters),
  contentPath: z.string().optional().describe(arcResumeConfig.arguments.contentPath),
  docsPath: z.string().optional().describe(arcResumeConfig.arguments.docsPath),
});

export type ArcResumeInput = z.infer<typeof arcResumeSchema>;

export interface ArcResumeOutput {
  arc: string;
  episode: number;
  episodeOutline: string;
  characters: Record<string, string>;
  recentChapters: Array<{
    file: string;
    pov: string;
    title: string;
    wordCount: number;
    excerpt: string;
  }>;
}

interface ChapterFile {
  file: string;
  episode: number;
  chapter: number;
  pov: string;
  title: string;
  excerpt: string;
  wordCount: number;
  mtime: number;
}

export function arcResume(input: ArcResumeInput): ArcResumeOutput {
  const parsed = arcResumeSchema.parse(input);
  const { arc, episode, contentPath = './content', docsPath = './docs' } = parsed;
  const lastChapters = parsed.lastChapters ?? 3;

  // Scan content directory for chapters
  const arcDir = join(contentPath, arc);

  if (!readdirSync(contentPath).includes(arc)) {
    throw new Error(`No chapters found for arc "${arc}"`);
  }

  const chapters: ChapterFile[] = [];
  const entries = readdirSync(arcDir, { withFileTypes: true });

  // Check if chapters are directly in arc dir or in episode subdirs
  const hasEpisodeDirs = entries.some((e) => e.isDirectory());

  if (hasEpisodeDirs) {
    // Chapters in episode subdirectories
    for (const entry of entries.filter((e) => e.isDirectory())) {
      const files = readdirSync(join(arcDir, entry.name)).filter((f) => f.endsWith('.md'));

      for (const file of files) {
        const filePath = join(arcDir, entry.name, file);
        const content = readFileSync(filePath, 'utf-8');
        const { metadata, stats } = parseChapter(content);
        const mtime = statSync(filePath).mtimeMs;

        chapters.push({
          file: filePath,
          episode: metadata.episode,
          chapter: metadata.chapter,
          pov: metadata.pov,
          title: metadata.title,
          excerpt: metadata.summary || '',
          wordCount: stats.wordCount,
          mtime,
        });
      }
    }
  } else {
    // Chapters directly in arc directory
    const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);

    for (const file of files) {
      const filePath = join(arcDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const { metadata, stats } = parseChapter(content);
      const mtime = statSync(filePath).mtimeMs;

      chapters.push({
        file: filePath,
        episode: metadata.episode,
        chapter: metadata.chapter,
        pov: metadata.pov,
        title: metadata.title,
        excerpt: metadata.summary || '',
        wordCount: stats.wordCount,
        mtime,
      });
    }
  }

  if (chapters.length === 0) {
    throw new Error(`No chapters found for arc "${arc}"`);
  }

  // Determine target episode
  const targetEpisode = episode ?? Math.max(...chapters.map((c) => c.episode));

  // Filter and sort chapters for target episode
  const episodeChapters = chapters
    .filter((c) => c.episode === targetEpisode)
    .sort((a, b) => b.chapter - a.chapter);

  if (episodeChapters.length === 0) {
    throw new Error(`No chapters found for arc "${arc}" episode ${targetEpisode}`);
  }

  // Get recent chapters
  const recentChapters = episodeChapters.slice(0, lastChapters).map((c) => ({
    file: c.file,
    pov: c.pov,
    title: c.title,
    wordCount: c.wordCount,
    excerpt: c.excerpt,
  }));

  // Read episode outline
  const episodesDir = join(docsPath, 'episodes');
  const episodeFiles = readdirSync(episodesDir);
  const episodeFile = episodeFiles.find((f) =>
    f.startsWith(`${arc}-ep${String(targetEpisode).padStart(2, '0')}`),
  );

  if (!episodeFile) {
    throw new Error(`Episode outline not found for arc "${arc}" episode ${targetEpisode}`);
  }

  const episodeOutline = readFileSync(join(episodesDir, episodeFile), 'utf-8');

  // Read character sheets
  const charactersDir = join(docsPath, 'characters', arc);
  const characters: Record<string, string> = {};

  try {
    const characterFiles = readdirSync(charactersDir);
    for (const file of characterFiles) {
      if (file.endsWith('.md')) {
        const name = file.replace('.md', '');
        characters[name] = readFileSync(join(charactersDir, file), 'utf-8');
      }
    }
  } catch {
    // Characters directory might not exist
  }

  return {
    arc,
    episode: targetEpisode,
    episodeOutline,
    characters,
    recentChapters,
  };
}
