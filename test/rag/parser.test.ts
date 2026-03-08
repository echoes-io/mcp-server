import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EchoesMarkdownParser } from '../../lib/rag/parser.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'content');

describe('EchoesMarkdownParser', () => {
  const parser = new EchoesMarkdownParser(FIXTURES);

  it('supports .md extension', () => {
    expect(parser.supportedExtensions).toEqual(['.md']);
  });

  it('parses chapter frontmatter into document fields', async () => {
    const filePath = join(FIXTURES, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
    const doc = await parser.parse(filePath);

    expect(doc.metadata.fields).toMatchObject({
      arc: 'bloom',
      episode: '1',
      chapter: '1',
      pov: 'Nic',
      title: "L'arrivo",
      location: 'Aeroporto di Malpensa',
      date: '2024-03-15',
    });
  });

  it('returns content without frontmatter', async () => {
    const filePath = join(FIXTURES, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
    const doc = await parser.parse(filePath);

    expect(doc.content).toContain('Malpensa era affollato');
    expect(doc.content).not.toContain('---');
  });

  it('computes file hash', async () => {
    const filePath = join(FIXTURES, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
    const doc = await parser.parse(filePath);
    const fields = doc.metadata.fields as Record<string, string>;

    expect(fields.file_hash).toHaveLength(16);
  });

  it('computes relative file path', async () => {
    const filePath = join(FIXTURES, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
    const doc = await parser.parse(filePath);
    const fields = doc.metadata.fields as Record<string, string>;

    expect(fields.file_path).toBe('bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
  });

  it('includes word count', async () => {
    const filePath = join(FIXTURES, 'bloom/ep01-primo-incontro/ep01-ch001-nic-arrivo.md');
    const doc = await parser.parse(filePath);
    const fields = doc.metadata.fields as Record<string, string>;

    expect(Number(fields.word_count)).toBeGreaterThan(0);
  });

  it('handles missing optional fields', async () => {
    const filePath = join(FIXTURES, 'bloom/ep02-la-cena/ep02-ch001-nic-marco.md');
    const doc = await parser.parse(filePath);
    const fields = doc.metadata.fields as Record<string, string>;

    expect(fields.arc).toBe('bloom');
  });
});
