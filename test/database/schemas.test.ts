import { describe, expect, it } from 'vitest';

import {
  createChapterSchema,
  createEntitySchema,
  ENTITY_TYPES,
  RELATION_TYPES,
  RelationSchema,
} from '../../lib/database/schemas.js';

describe('ENTITY_TYPES', () => {
  it('contains expected types', () => {
    expect(ENTITY_TYPES).toContain('CHARACTER');
    expect(ENTITY_TYPES).toContain('LOCATION');
    expect(ENTITY_TYPES).toContain('EVENT');
    expect(ENTITY_TYPES).toContain('OBJECT');
    expect(ENTITY_TYPES).toContain('EMOTION');
    expect(ENTITY_TYPES).toHaveLength(5);
  });
});

describe('RELATION_TYPES', () => {
  it('contains expected types', () => {
    expect(RELATION_TYPES).toContain('LOVES');
    expect(RELATION_TYPES).toContain('KNOWS');
    expect(RELATION_TYPES).toContain('LOCATED_IN');
    expect(RELATION_TYPES).toHaveLength(15);
  });
});

describe('createChapterSchema', () => {
  it('has correct number of fields', () => {
    const schema = createChapterSchema(384);
    expect(schema.fields).toHaveLength(18);
  });

  it('has required fields', () => {
    const schema = createChapterSchema(384);
    const fieldNames = schema.fields.map((f) => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('file_path');
    expect(fieldNames).toContain('arc');
    expect(fieldNames).toContain('vector');
    expect(fieldNames).toContain('entities');
  });

  it('uses provided embedding dimension', () => {
    const schema = createChapterSchema(512);
    const vectorField = schema.fields.find((f) => f.name === 'vector');
    expect(vectorField?.type.listSize).toBe(512);
  });

  it('creates different schemas for different dimensions', () => {
    const schema384 = createChapterSchema(384);
    const schema768 = createChapterSchema(768);

    const vector384 = schema384.fields.find((f) => f.name === 'vector');
    const vector768 = schema768.fields.find((f) => f.name === 'vector');

    expect(vector384?.type.listSize).toBe(384);
    expect(vector768?.type.listSize).toBe(768);
  });
});

describe('createEntitySchema', () => {
  it('has correct number of fields', () => {
    const schema = createEntitySchema(384);
    expect(schema.fields).toHaveLength(14);
  });

  it('has required fields', () => {
    const schema = createEntitySchema(384);
    const fieldNames = schema.fields.map((f) => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('arc');
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('type');
    expect(fieldNames).toContain('vector');
  });

  it('uses provided embedding dimension', () => {
    const schema = createEntitySchema(256);
    const vectorField = schema.fields.find((f) => f.name === 'vector');
    expect(vectorField?.type.listSize).toBe(256);
  });
});

describe('RelationSchema', () => {
  it('has correct number of fields', () => {
    expect(RelationSchema.fields).toHaveLength(12);
  });

  it('has required fields', () => {
    const fieldNames = RelationSchema.fields.map((f) => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('source_entity');
    expect(fieldNames).toContain('target_entity');
    expect(fieldNames).toContain('type');
    expect(fieldNames).toContain('weight');
  });
});
