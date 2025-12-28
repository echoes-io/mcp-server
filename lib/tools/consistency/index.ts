import z from 'zod';

import { DEFAULT_DB_PATH } from '../../constants.js';
import type { ToolConfig } from '../../types.js';
import { checkEntityDuplicate } from './rules/entity-duplicate.js';
import { checkFirstTimeContent } from './rules/first-time-content.js';
import { checkKinkFirsts } from './rules/kink-firsts.js';
import { checkOutfitClaims } from './rules/outfit-claims.js';
import { checkRelationJump } from './rules/relation-jump.js';
import type { CheckResult, Issue, RuleName } from './types.js';

export const checkConsistencyConfig: ToolConfig = {
  name: 'check-consistency',
  description: 'Analyze arc for narrative inconsistencies.',
  arguments: {
    contentPath: 'Path to the content directory.',
    arc: 'Arc name to check.',
    rules:
      'Specific rules to run (comma-separated). Available: kink-firsts, entity-duplicate, relation-jump, first-time-content, outfit-claims.',
    severity: 'Minimum severity to report: error, warning, info.',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const checkConsistencySchema = z.object({
  contentPath: z.string().describe(checkConsistencyConfig.arguments.contentPath),
  arc: z.string().describe(checkConsistencyConfig.arguments.arc),
  rules: z
    .array(
      z.enum([
        'kink-firsts',
        'outfit-claims',
        'first-time-content',
        'relation-jump',
        'entity-duplicate',
      ]),
    )
    .optional()
    .describe(checkConsistencyConfig.arguments.rules),
  severity: z
    .enum(['error', 'warning', 'info'])
    .optional()
    .describe(checkConsistencyConfig.arguments.severity),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(checkConsistencyConfig.arguments.dbPath),
});

export type CheckConsistencyInput = z.infer<typeof checkConsistencySchema>;

const AVAILABLE_RULES: RuleName[] = [
  'kink-firsts',
  'entity-duplicate',
  'relation-jump',
  'first-time-content',
  'outfit-claims',
];

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

export async function checkConsistency(input: CheckConsistencyInput): Promise<CheckResult> {
  const { contentPath, arc, rules, severity, dbPath } = checkConsistencySchema.parse(input);

  const rulesToRun = rules ?? AVAILABLE_RULES;
  const minSeverity = severity ?? 'info';

  let allIssues: Issue[] = [];

  for (const rule of rulesToRun) {
    if (!AVAILABLE_RULES.includes(rule)) continue;

    if (rule === 'kink-firsts') {
      const issues = await checkKinkFirsts(contentPath, arc);
      allIssues.push(...issues);
    }

    if (rule === 'entity-duplicate') {
      const issues = await checkEntityDuplicate(dbPath, arc);
      allIssues.push(...issues);
    }

    if (rule === 'relation-jump') {
      const issues = await checkRelationJump(dbPath, arc);
      allIssues.push(...issues);
    }

    if (rule === 'first-time-content') {
      const issues = await checkFirstTimeContent(contentPath, arc);
      allIssues.push(...issues);
    }

    if (rule === 'outfit-claims') {
      const issues = await checkOutfitClaims(contentPath, arc);
      allIssues.push(...issues);
    }
  }

  // Filter by severity
  allIssues = allIssues.filter(
    (issue) => SEVERITY_ORDER[issue.severity] <= SEVERITY_ORDER[minSeverity],
  );

  return {
    arc,
    issues: allIssues,
    summary: {
      errors: allIssues.filter((i) => i.severity === 'error').length,
      warnings: allIssues.filter((i) => i.severity === 'warning').length,
      info: allIssues.filter((i) => i.severity === 'info').length,
    },
  };
}

export * from './types.js';
