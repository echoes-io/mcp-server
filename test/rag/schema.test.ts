import { describe, expect, it } from 'vitest';

import { ENTITY_TYPES, narrativeSchema, RELATION_TYPES } from '../../lib/rag/schema.js';

describe('narrativeSchema', () => {
  it('uses all entity types from schemas', () => {
    expect(narrativeSchema.entityTypes).toEqual(ENTITY_TYPES);
  });

  it('uses all relation types from schemas', () => {
    expect(narrativeSchema.relationTypes).toEqual(RELATION_TYPES);
  });

  it('validates known entity types', () => {
    expect(narrativeSchema.isValidEntityType('CHARACTER')).toBe(true);
    expect(narrativeSchema.isValidEntityType('LOCATION')).toBe(true);
    expect(narrativeSchema.isValidEntityType('UNKNOWN')).toBe(false);
  });

  it('validates known relation types', () => {
    expect(narrativeSchema.isValidRelationType('LOVES')).toBe(true);
    expect(narrativeSchema.isValidRelationType('UNKNOWN')).toBe(false);
  });

  it('normalizes unknown types to Other', () => {
    expect(narrativeSchema.normalizeEntityType('UNKNOWN')).toBe('Other');
    expect(narrativeSchema.normalizeRelationType('UNKNOWN')).toBe('Other');
  });

  it('defines filterable document fields', () => {
    expect(narrativeSchema.documentFields.arc).toEqual({ type: 'string', filterable: true });
    expect(narrativeSchema.documentFields.pov).toEqual({ type: 'string', filterable: true });
    expect(narrativeSchema.documentFields.title).toEqual({ type: 'string' });
  });

  it('defines entity fields for HITL', () => {
    expect(narrativeSchema.entityFields.aliases).toBeDefined();
    expect(narrativeSchema.entityFields.review_status).toEqual({
      type: 'enum',
      values: ['pending', 'approved', 'rejected'],
      default: 'approved',
    });
  });

  it('defines relation fields', () => {
    expect(narrativeSchema.relationFields.weight).toEqual({ type: 'string', default: '0.5' });
  });
});
