import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateEmbeddings } from '../../../indexer/embeddings.js';
import { parseMarkdown } from '../../../utils.js';
import type { ChapterRef, Issue } from '../types.js';

// Patterns to find "first time" claims in content
const FIRST_TIME_PATTERNS = [
  /per la prima volta[^.!?]*/gi,
  /era la prima volta[^.!?]*/gi,
  /la prima volta che[^.!?]*/gi,
  /prima volta nella (mia|sua|loro) vita[^.!?]*/gi,
  /for the first time[^.!?]*/gi,
  /it was the first time[^.!?]*/gi,
];

interface FirstTimeClaim {
  ref: ChapterRef;
  text: string;
  context: string;
}

function extractFirstTimeClaims(content: string, ref: ChapterRef): FirstTimeClaim[] {
  const claims: FirstTimeClaim[] = [];

  for (const pattern of FIRST_TIME_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[0].trim();
      // Get surrounding context (50 chars before and after)
      const start = Math.max(0, (match.index ?? 0) - 50);
      const end = Math.min(content.length, (match.index ?? 0) + match[0].length + 50);
      const context = content.slice(start, end).replace(/\s+/g, ' ').trim();

      claims.push({ ref, text, context });
    }
  }

  return claims;
}

function scanChaptersForFirstTime(contentPath: string, arc: string): FirstTimeClaim[] {
  const claims: FirstTimeClaim[] = [];

  function scanDir(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = readFileSync(fullPath, 'utf-8');
          const { metadata, content } = parseMarkdown(raw);

          if (metadata.arc !== arc) continue;

          const ref: ChapterRef = {
            arc: metadata.arc,
            episode: metadata.episode ?? 0,
            chapter: metadata.chapter ?? 0,
          };

          claims.push(...extractFirstTimeClaims(content, ref));
        } catch {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(contentPath);

  // Sort by episode, then chapter
  claims.sort((a, b) => {
    if (a.ref.episode !== b.ref.episode) return a.ref.episode - b.ref.episode;
    return a.ref.chapter - b.ref.chapter;
  });

  return claims;
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function checkFirstTimeContent(
  contentPath: string,
  arc: string,
  similarityThreshold = 0.85,
): Promise<Issue[]> {
  const claims = scanChaptersForFirstTime(contentPath, arc);

  if (claims.length < 2) return [];

  // Generate embeddings for all claims
  const texts = claims.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  const issues: Issue[] = [];
  const reported = new Set<string>();

  // Find similar claims
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);

      if (similarity >= similarityThreshold) {
        const key = `${i}:${j}`;
        if (reported.has(key)) continue;
        reported.add(key);

        const current = claims[j];
        const previous = claims[i];

        issues.push({
          type: 'FIRST_TIME_DUPLICATE',
          severity: 'info',
          message: `Similar "first time" claims found`,
          current: current.ref,
          previous: previous.ref,
          details: {
            currentText: current.text,
            previousText: previous.text,
            similarity: Math.round(similarity * 100) / 100,
          },
        });
      }
    }
  }

  return issues;
}
