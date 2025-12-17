/**
 * Part - Part within an episode
 */
export interface Part {
  /** Timeline name (foreign key) */
  timelineName: string;
  /** Arc name (foreign key) */
  arcName: string;
  /** Episode number (foreign key) */
  episodeNumber: number;
  /** Part number (part of composite primary key) */
  number: number;
  /** Part slug */
  slug: string;
  /** Part title */
  title: string;
  /** Part description */
  description: string;
}
