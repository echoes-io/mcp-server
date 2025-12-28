import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseMarkdown } from '../../../utils.js';
import {
  extractFirstSubject,
  isFirstTimeKink,
  normalizeKinkToken,
  tokenizeKink,
} from '../patterns.js';
import type { ChapterRef, Issue } from '../types.js';

interface ChapterKink {
  ref: ChapterRef;
  kink: string;
  tokens: string[];
}

function scanChaptersWithKink(contentPath: string, arc: string): ChapterKink[] {
  const chapters: ChapterKink[] = [];

  function scanDir(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = readFileSync(fullPath, 'utf-8');
          const { metadata } = parseMarkdown(raw);

          if (metadata.arc !== arc) continue;
          if (!metadata.kink) continue;

          chapters.push({
            ref: {
              arc: metadata.arc,
              episode: metadata.episode ?? 0,
              chapter: metadata.chapter ?? 0,
            },
            kink: metadata.kink,
            tokens: tokenizeKink(metadata.kink),
          });
        } catch {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(contentPath);

  // Sort by episode, then chapter
  chapters.sort((a, b) => {
    if (a.ref.episode !== b.ref.episode) return a.ref.episode - b.ref.episode;
    return a.ref.chapter - b.ref.chapter;
  });

  return chapters;
}

export async function checkKinkFirsts(contentPath: string, arc: string): Promise<Issue[]> {
  const chapters = scanChaptersWithKink(contentPath, arc);
  const issues: Issue[] = [];

  // Track seen "first" subjects: normalized subject -> first occurrence
  const seenFirsts = new Map<string, { ref: ChapterRef; token: string }>();

  for (const chapter of chapters) {
    for (const token of chapter.tokens) {
      if (!isFirstTimeKink(token)) continue;

      const subject = extractFirstSubject(token);
      if (!subject) continue;

      const normalized = normalizeKinkToken(subject);
      const existing = seenFirsts.get(normalized);

      if (existing) {
        issues.push({
          type: 'KINK_FIRST_DUPLICATE',
          severity: 'warning',
          message: `Kink "${token}" duplicates earlier "${existing.token}"`,
          current: chapter.ref,
          previous: existing.ref,
          details: {
            currentKink: token,
            previousKink: existing.token,
            normalizedSubject: normalized,
          },
        });
      } else {
        seenFirsts.set(normalized, { ref: chapter.ref, token });
      }
    }
  }

  return issues;
}
