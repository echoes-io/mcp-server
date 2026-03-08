import { defineSchema } from '@flowrag/core';

export const ENTITY_TYPES = ['CHARACTER', 'LOCATION', 'EVENT', 'OBJECT', 'EMOTION'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RELATION_TYPES = [
  'LOVES',
  'HATES',
  'KNOWS',
  'RELATED_TO',
  'FRIENDS_WITH',
  'ENEMIES_WITH',
  'LOCATED_IN',
  'LIVES_IN',
  'TRAVELS_TO',
  'HAPPENS_BEFORE',
  'HAPPENS_AFTER',
  'CAUSES',
  'OWNS',
  'USES',
  'SEEKS',
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const narrativeSchema = defineSchema({
  entityTypes: ENTITY_TYPES,
  relationTypes: RELATION_TYPES,
  documentFields: {
    arc: { type: 'string', filterable: true },
    episode: { type: 'string', filterable: true },
    chapter: { type: 'string', filterable: true },
    pov: { type: 'string', filterable: true },
    title: { type: 'string' },
    location: { type: 'string', filterable: true },
    date: { type: 'string' },
    file_path: { type: 'string' },
    file_hash: { type: 'string' },
    word_count: { type: 'string' },
  },
  entityFields: {
    aliases: { type: 'string' },
    review_status: {
      type: 'enum',
      values: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    reviewed_at: { type: 'string' },
    original_extraction: { type: 'string' },
  },
  relationFields: {
    weight: { type: 'string', default: '0.5' },
  },
});
