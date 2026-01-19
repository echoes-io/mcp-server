import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

export function generateArcResumePrompt(
  arc: string,
  episode: number | undefined,
  lastChapters: number,
  contentPath: string,
  docsPath: string,
): string {
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
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) continue;

        const metadata: Record<string, unknown> = {};
        for (const line of frontmatterMatch[1].split('\n')) {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            metadata[key.trim()] = Number.isNaN(Number(value)) ? value : Number(value);
          }
        }

        const wordCount = content.split(/\s+/).length;
        const mtime = statSync(filePath).mtimeMs;

        chapters.push({
          file: filePath,
          episode: metadata.episode as number,
          chapter: metadata.chapter as number,
          pov: metadata.pov as string,
          title: metadata.title as string,
          excerpt: (metadata.excerpt as string) || '',
          wordCount,
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
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;

      const metadata: Record<string, unknown> = {};
      for (const line of frontmatterMatch[1].split('\n')) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          const value = valueParts.join(':').trim();
          metadata[key.trim()] = Number.isNaN(Number(value)) ? value : Number(value);
        }
      }

      const wordCount = content.split(/\s+/).length;
      const mtime = statSync(filePath).mtimeMs;

      chapters.push({
        file: filePath,
        episode: metadata.episode as number,
        chapter: metadata.chapter as number,
        pov: metadata.pov as string,
        title: metadata.title as string,
        excerpt: (metadata.excerpt as string) || '',
        wordCount,
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
  const recentChapters = episodeChapters.slice(0, lastChapters);

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

  // Build prompt
  let prompt = `# Arc Resume: ${arc} - Episode ${targetEpisode}\n\n`;

  prompt += '## Episode Outline\n\n';
  prompt += `${episodeOutline}\n\n`;

  if (Object.keys(characters).length > 0) {
    prompt += '## Characters\n\n';
    for (const [name, content] of Object.entries(characters)) {
      prompt += `### ${name}\n\n${content}\n\n`;
    }
  }

  prompt += '## Recent Chapters\n\n';
  for (const chapter of recentChapters) {
    prompt += `### Chapter ${chapter.chapter}: ${chapter.title} (${chapter.pov})\n\n`;
    prompt += `**File**: ${chapter.file}\n`;
    prompt += `**Word Count**: ${chapter.wordCount}\n`;
    if (chapter.excerpt) {
      prompt += `**Excerpt**: ${chapter.excerpt}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}
