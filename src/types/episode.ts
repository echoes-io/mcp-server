/**
 * Episode - Episode within an arc
 */
export interface Episode {
  /** Timeline name (foreign key) */
  timelineName: string;
  /** Arc name (foreign key) */
  arcName: string;
  /** Episode number (part of composite primary key) */
  number: number;
  /** Episode slug */
  slug: string;
  /** Episode title */
  title: string;
  /** Episode description */
  description: string;
}
