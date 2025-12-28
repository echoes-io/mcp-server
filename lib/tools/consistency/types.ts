export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueType =
  | 'KINK_FIRST_DUPLICATE'
  | 'OUTFIT_CONTRADICTION'
  | 'FIRST_TIME_DUPLICATE'
  | 'RELATION_JUMP'
  | 'ENTITY_DUPLICATE';

export interface ChapterRef {
  arc: string;
  episode: number;
  chapter: number;
}

export interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  current: ChapterRef;
  previous?: ChapterRef;
  details: Record<string, unknown>;
}

export interface CheckResult {
  arc: string;
  issues: Issue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export type RuleName =
  | 'kink-firsts'
  | 'outfit-claims'
  | 'first-time-content'
  | 'relation-jump'
  | 'entity-duplicate';

export type RuleFunction = (arc: string, dbPath: string) => Promise<Issue[]>;
