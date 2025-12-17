import type { ChapterMetadata, TextStats } from './metadata.js';

/**
 * Chapter - Individual content file
 * Extends ChapterMetadata and TextStats from @echoes-io/utils
 */
export interface Chapter extends ChapterMetadata, TextStats {
  /** Timeline name (foreign key) */
  timelineName: string;
  /** Arc name (foreign key) */
  arcName: string;
  /** Episode number (foreign key) */
  episodeNumber: number;
  /** Part number (foreign key) */
  partNumber: number;
  /** Chapter number (part of composite primary key, unique within episode) */
  number: number;
}
