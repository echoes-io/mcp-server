/**
 * Frontmatter metadata from YAML headers
 */
export interface ChapterMetadata {
  pov: string;
  title: string;
  date: string;
  timeline: string;
  arc: string;
  episode: number;
  part: number;
  chapter: number;
  summary: string;
  location: string;
  outfit?: string;
  kink?: string;
}

/**
 * Text statistics calculated from content
 */
export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  sentences: number;
  readingTimeMinutes: number;
}

/**
 * Result of parsing a markdown file
 */
export interface ParsedMarkdown {
  metadata: ChapterMetadata;
  content: string;
}
