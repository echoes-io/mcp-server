import { readFile } from 'node:fs/promises';

import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import type { ToolConfig } from '../types.js';

export const reviewApplyConfig: ToolConfig = {
  name: 'review-apply',
  description: 'Apply corrections from review file to database.',
  arguments: {
    file: 'Path to review YAML file.',
    dryRun: 'Preview changes without applying (default: false).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const reviewApplySchema = z.object({
  file: z.string().min(1).describe(reviewApplyConfig.arguments.file),
  dryRun: z.boolean().optional().describe(reviewApplyConfig.arguments.dryRun),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(reviewApplyConfig.arguments.dbPath),
});

export type ReviewApplyInput = z.infer<typeof reviewApplySchema>;

// Simplified YAML parser for our specific format
// biome-ignore lint/suspicious/noExplicitAny: dynamic YAML parser for review files
function parseYaml(content: string): Record<string, any> {
  const lines = content.split('\n').filter((line) => !line.trim().startsWith('#') && line.trim());
  // biome-ignore lint/suspicious/noExplicitAny: dynamic structure
  const result: Record<string, any> = {};
  let currentSection = '';
  // biome-ignore lint/suspicious/noExplicitAny: dynamic structure
  let currentItem: any = null;
  let inAdditions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.endsWith(':') && !line.startsWith(' ')) {
      currentSection = trimmed.slice(0, -1);
      if (currentSection === 'additions') {
        inAdditions = true;
        result[currentSection] = { entities: [], relations: [] };
      } else {
        result[currentSection] = [];
      }
      continue;
    }

    if (trimmed.startsWith('- ')) {
      currentItem = {};
      if (!inAdditions) result[currentSection].push(currentItem);
      continue;
    }

    if (trimmed.includes(': ') && currentItem) {
      const [key, ...valueParts] = trimmed.split(': ');
      const value = valueParts.join(': ').replace(/^"(.*)"$/, '$1');
      const cleanKey = key.replace(/^\s*/, '');

      if (cleanKey === 'aliases' || cleanKey === 'chapters') {
        const arrayMatch = value.match(/\[(.*)\]/);
        currentItem[cleanKey] = arrayMatch
          ? arrayMatch[1]
              .split(',')
              .map((item) => item.trim().replace(/^"(.*)"$/, '$1'))
              .filter(Boolean)
          : [];
      } else if (cleanKey === 'weight') {
        currentItem[cleanKey] = Number.parseFloat(value);
      } else {
        currentItem[cleanKey] = value;
      }
    }
  }

  return result;
}

interface ApplyResult {
  preview: boolean;
  changes: {
    entities: { approved: number; rejected: number; modified: number; added: number };
    relations: { approved: number; rejected: number; modified: number; added: number };
  };
  details: string[];
}

export async function reviewApply(input: ReviewApplyInput): Promise<ApplyResult> {
  const { file, dbPath } = reviewApplySchema.parse(input);
  const dryRun = input.dryRun ?? false;

  const content = await readFile(file, 'utf8');
  const reviewData = parseYaml(content);

  // Extract arc from first entity ID or metadata
  const firstEntityId = reviewData.entities?.[0]?.id || '';
  const arc = firstEntityId.split(':')[0] || reviewData.metadata?.arc || 'unknown';
  const { storage } = createEchoesRAG({ dbPath, arc });

  const result: ApplyResult = {
    preview: dryRun,
    changes: {
      entities: { approved: 0, rejected: 0, modified: 0, added: 0 },
      relations: { approved: 0, rejected: 0, modified: 0, added: 0 },
    },
    details: [],
  };

  if (reviewData.entities) {
    for (const entity of reviewData.entities) {
      const status = entity._correction ? 'modified' : entity.status;
      const correction = entity._correction || {};

      if (status === 'approved' || status === 'modified' || status === 'rejected') {
        result.changes.entities[status as 'approved' | 'modified' | 'rejected']++;
        const icon = status === 'approved' ? '✅' : status === 'modified' ? '✏️' : '❌';
        const suffix = status === 'modified' ? ` (${Object.keys(correction).join(', ')})` : '';
        result.details.push(`${icon} Entity ${status}: ${entity.name}${suffix}`);

        if (!dryRun) {
          await storage.graph.addEntity({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            description: correction.description || entity.description,
            sourceChunkIds: [],
            fields: {
              aliases: correction.aliases || entity.aliases || [],
              review_status: status,
              reviewed_at: Date.now(),
              ...(status === 'modified' ? { original_extraction: JSON.stringify(entity) } : {}),
            },
          });
        }
      }
    }
  }

  if (reviewData.relations) {
    for (const relation of reviewData.relations) {
      const status = relation._correction ? 'modified' : relation.status;
      const correction = relation._correction || {};

      if (status === 'approved' || status === 'modified' || status === 'rejected') {
        result.changes.relations[status as 'approved' | 'modified' | 'rejected']++;
        const icon = status === 'approved' ? '✅' : status === 'modified' ? '✏️' : '❌';
        result.details.push(
          `${icon} Relation ${status}: ${relation.source} → ${relation.type} → ${relation.target}`,
        );

        if (!dryRun) {
          await storage.graph.addRelation({
            id: relation.id,
            sourceId: `CHARACTER:${relation.source}`,
            targetId: `CHARACTER:${relation.target}`,
            type: correction.type || relation.type,
            description: correction.description || relation.description,
            keywords: [],
            sourceChunkIds: correction.chapters || relation.chapters || [],
            fields: {
              weight: correction.weight || relation.weight,
              review_status: status,
              reviewed_at: Date.now(),
              ...(status === 'modified' ? { original_extraction: JSON.stringify(relation) } : {}),
            },
          });
        }
      }
    }
  }

  return result;
}
