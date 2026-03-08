import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import type { DocumentParser, ParsedDocument } from '@flowrag/core';

import { parseChapter } from '../utils.js';

export class EchoesMarkdownParser implements DocumentParser {
  readonly supportedExtensions = ['.md'];

  constructor(private readonly basePath: string) {}

  async parse(filePath: string): Promise<ParsedDocument> {
    const raw = readFileSync(filePath, 'utf-8');
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    const { metadata, content, stats } = parseChapter(raw);

    return {
      content,
      metadata: {
        filePath,
        createdAt: new Date(),
        updatedAt: new Date(),
        fields: {
          arc: metadata.arc,
          episode: String(metadata.episode),
          chapter: String(metadata.chapter),
          pov: metadata.pov,
          title: metadata.title,
          location: metadata.location ?? '',
          date: metadata.date ?? '',
          file_path: relative(this.basePath, filePath),
          file_hash: hash,
          word_count: String(stats.wordCount),
          ...(metadata.kink ? { kink: metadata.kink } : {}),
          ...(metadata.outfit ? { outfit: metadata.outfit } : {}),
        },
      },
    };
  }
}
