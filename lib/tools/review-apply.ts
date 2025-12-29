import { readFile } from 'node:fs/promises';

import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { Database } from '../database/index.js';
import type { EntityType, RelationType } from '../database/schemas.js';
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
  file: z.string().describe(reviewApplyConfig.arguments.file),
  dryRun: z.boolean().optional().describe(reviewApplyConfig.arguments.dryRun),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(reviewApplyConfig.arguments.dbPath),
});

export type ReviewApplyInput = z.infer<typeof reviewApplySchema>;

// Simplified YAML parser for our specific format
function parseYaml(content: string): any {
  const lines = content.split('\n').filter((line) => !line.trim().startsWith('#') && line.trim());
  const result: any = {};
  let currentSection = '';
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
      if (inAdditions) {
        // Handle additions section
        continue;
      } else {
        result[currentSection].push(currentItem);
      }
    }

    if (trimmed.includes(': ') && currentItem) {
      const [key, ...valueParts] = trimmed.split(': ');
      const value = valueParts.join(': ').replace(/^"(.*)"$/, '$1');
      const cleanKey = key.replace(/^\s*/, '');

      if (cleanKey === 'aliases' || cleanKey === 'chapters') {
        // Parse array format: [item1, item2]
        const arrayMatch = value.match(/\[(.*)\]/);
        if (arrayMatch) {
          currentItem[cleanKey] = arrayMatch[1]
            .split(',')
            .map((item) => item.trim().replace(/^"(.*)"$/, '$1'))
            .filter((item) => item);
        } else {
          currentItem[cleanKey] = [];
        }
      } else if (cleanKey === 'weight') {
        currentItem[cleanKey] = parseFloat(value);
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
    entities: {
      approved: number;
      rejected: number;
      modified: number;
      added: number;
    };
    relations: {
      approved: number;
      rejected: number;
      modified: number;
      added: number;
    };
  };
  details: string[];
}

export async function reviewApply(input: ReviewApplyInput): Promise<ApplyResult> {
  const { file, dbPath } = reviewApplySchema.parse(input);
  const dryRun = input.dryRun ?? false;

  // Read and parse YAML file
  const content = await readFile(file, 'utf8');
  const reviewData = parseYaml(content);

  const db = new Database(dbPath);
  await db.connect();

  const result: ApplyResult = {
    preview: dryRun,
    changes: {
      entities: { approved: 0, rejected: 0, modified: 0, added: 0 },
      relations: { approved: 0, rejected: 0, modified: 0, added: 0 },
    },
    details: [],
  };

  // Process entities
  if (reviewData.entities) {
    for (const entity of reviewData.entities) {
      const status = entity._correction ? 'modified' : entity.status;

      if (status === 'approved') {
        result.changes.entities.approved++;
        result.details.push(`✅ Entity approved: ${entity.name}`);

        if (!dryRun) {
          await db.upsertEntities([
            {
              id: entity.id,
              arc: entity.id.split(':')[0],
              name: entity.name,
              type: entity.type as EntityType,
              description: entity.description,
              aliases: entity.aliases || [],
              vector: Array(384).fill(0), // Placeholder
              chapters: [],
              chapter_count: 0,
              first_appearance: '',
              indexed_at: Date.now(),
              review_status: 'approved',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      } else if (status === 'modified') {
        result.changes.entities.modified++;
        const correction = entity._correction || {};
        result.details.push(
          `✏️ Entity modified: ${entity.name} (${Object.keys(correction).join(', ')})`,
        );

        if (!dryRun) {
          await db.upsertEntities([
            {
              id: entity.id,
              arc: entity.id.split(':')[0],
              name: entity.name,
              type: entity.type as EntityType,
              description: correction.description || entity.description,
              aliases: correction.aliases || entity.aliases || [],
              vector: Array(384).fill(0), // Placeholder
              chapters: [],
              chapter_count: 0,
              first_appearance: '',
              indexed_at: Date.now(),
              review_status: 'modified',
              reviewed_at: Date.now(),
              original_extraction: JSON.stringify(entity),
            } as any,
          ]);
        }
      } else if (status === 'rejected') {
        result.changes.entities.rejected++;
        result.details.push(`❌ Entity rejected: ${entity.name}`);

        // Note: In a full implementation, we might delete or mark as rejected
        if (!dryRun) {
          await db.upsertEntities([
            {
              id: entity.id,
              arc: entity.id.split(':')[0],
              name: entity.name,
              type: entity.type as EntityType,
              description: entity.description,
              aliases: entity.aliases || [],
              vector: Array(384).fill(0), // Placeholder
              chapters: [],
              chapter_count: 0,
              first_appearance: '',
              indexed_at: Date.now(),
              review_status: 'rejected',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      }
    }
  }

  // Process relations
  if (reviewData.relations) {
    for (const relation of reviewData.relations) {
      const status = relation._correction ? 'modified' : relation.status;

      if (status === 'approved') {
        result.changes.relations.approved++;
        result.details.push(
          `✅ Relation approved: ${relation.source} → ${relation.type} → ${relation.target}`,
        );

        if (!dryRun) {
          await db.upsertRelations([
            {
              id: relation.id,
              arc: relation.id.split(':')[0],
              source_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.source}`,
              target_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.target}`,
              type: relation.type as RelationType,
              description: relation.description,
              weight: relation.weight,
              chapters: relation.chapters || [],
              indexed_at: Date.now(),
              review_status: 'approved',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      } else if (status === 'modified') {
        result.changes.relations.modified++;
        const correction = relation._correction || {};
        result.details.push(
          `✏️ Relation modified: ${relation.source} → ${relation.type} → ${relation.target}`,
        );

        if (!dryRun) {
          await db.upsertRelations([
            {
              id: relation.id,
              arc: relation.id.split(':')[0],
              source_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.source}`,
              target_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.target}`,
              type: (correction.type || relation.type) as RelationType,
              description: correction.description || relation.description,
              weight: correction.weight || relation.weight,
              chapters: correction.chapters || relation.chapters || [],
              indexed_at: Date.now(),
              review_status: 'modified',
              reviewed_at: Date.now(),
              original_extraction: JSON.stringify(relation),
            } as any,
          ]);
        }
      } else if (status === 'rejected') {
        result.changes.relations.rejected++;
        result.details.push(
          `❌ Relation rejected: ${relation.source} → ${relation.type} → ${relation.target}`,
        );

        if (!dryRun) {
          await db.upsertRelations([
            {
              id: relation.id,
              arc: relation.id.split(':')[0],
              source_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.source}`,
              target_entity: `${relation.id.split(':')[0]}:CHARACTER:${relation.target}`,
              type: relation.type as RelationType,
              description: relation.description,
              weight: relation.weight,
              chapters: relation.chapters || [],
              indexed_at: Date.now(),
              review_status: 'rejected',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      }
    }
  }

  // Process additions
  if (reviewData.additions) {
    if (reviewData.additions.entities) {
      for (const entity of reviewData.additions.entities) {
        result.changes.entities.added++;
        result.details.push(`➕ Entity added: ${entity.name}`);

        if (!dryRun) {
          const arc = reviewData.metadata?.arc || 'unknown';
          await db.upsertEntities([
            {
              id: `${arc}:${entity.type.toUpperCase()}:${entity.name}`,
              arc,
              name: entity.name,
              type: entity.type as EntityType,
              description: entity.description,
              aliases: entity.aliases || [],
              vector: Array(384).fill(0), // Placeholder
              chapters: [],
              chapter_count: 0,
              first_appearance: '',
              indexed_at: Date.now(),
              review_status: 'approved',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      }
    }

    if (reviewData.additions.relations) {
      for (const relation of reviewData.additions.relations) {
        result.changes.relations.added++;
        result.details.push(
          `➕ Relation added: ${relation.source} → ${relation.type} → ${relation.target}`,
        );

        if (!dryRun) {
          const arc = reviewData.metadata?.arc || 'unknown';
          await db.upsertRelations([
            {
              id: `${arc}:${relation.source}:${relation.type}:${relation.target}`,
              arc,
              source_entity: `${arc}:CHARACTER:${relation.source}`,
              target_entity: `${arc}:CHARACTER:${relation.target}`,
              type: relation.type as RelationType,
              description: relation.description,
              weight: 0.8,
              chapters: relation.chapters || [],
              indexed_at: Date.now(),
              review_status: 'approved',
              reviewed_at: Date.now(),
              original_extraction: null,
            } as any,
          ]);
        }
      }
    }
  }

  db.close();
  return result;
}
