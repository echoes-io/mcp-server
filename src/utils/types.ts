export interface ChapterMetadata {
  pov: string;
  title: string;
  timeline: string;
  arc: string;
  episode: number;
  part: number;
  chapter: number;
  summary: string;
  location: string;
  date: string;
  outfit?: string;
  kink?: string;
}

export interface ParsedMarkdown {
  metadata: ChapterMetadata;
  content: string;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  sentences: number;
  readingTimeMinutes: number;
}
