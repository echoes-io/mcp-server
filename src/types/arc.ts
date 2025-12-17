/**
 * Arc - Story arc within a timeline
 */
export interface Arc {
  /** Timeline name (foreign key) */
  timelineName: string;
  /** Arc name (part of composite primary key) */
  name: string;
  /** Arc number/order within timeline */
  number: number;
  /** Arc description */
  description: string;
}
