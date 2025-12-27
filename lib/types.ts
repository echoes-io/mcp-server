export interface Package {
  name: string;
  description: string;
  version: string;
}

export interface ToolConfig {
  name: string;
  description: string;
  arguments: Record<string, string>;
}

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

export interface ParsedMarkdown {
  metadata: ChapterMetadata;
  content: string;
}
