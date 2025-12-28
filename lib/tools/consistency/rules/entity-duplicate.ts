import { Database } from '../../../database/index.js';
import type { Issue } from '../types.js';

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Check if two names might be duplicates
function areSimilar(name1: string, name2: string, threshold = 2): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Exact match (case insensitive)
  if (n1 === n2) return false; // Same name, not a duplicate issue

  // One is prefix of other (Ali vs Alice) - only if prefix is at least 3 chars
  if (n1.length >= 3 && n2.startsWith(n1)) return true;
  if (n2.length >= 3 && n1.startsWith(n2)) return true;

  // Levenshtein distance - only for similar length names
  const lenDiff = Math.abs(n1.length - n2.length);
  if (lenDiff <= 2 && levenshtein(n1, n2) <= threshold) return true;

  return false;
}

// Group similar entities
function groupSimilarEntities(names: string[]): string[][] {
  const groups: string[][] = [];
  const used = new Set<string>();

  for (const name of names) {
    if (used.has(name)) continue;

    const group = [name];
    used.add(name);

    for (const other of names) {
      if (used.has(other)) continue;
      if (areSimilar(name, other)) {
        group.push(other);
        used.add(other);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

export async function checkEntityDuplicate(dbPath: string, arc: string): Promise<Issue[]> {
  const db = new Database(dbPath);
  await db.connect();

  const entities = await db.getEntities(arc);
  db.close();

  if (entities.length === 0) return [];

  const names = entities.map((e) => e.name);
  const groups = groupSimilarEntities(names);

  return groups.map((group) => ({
    type: 'ENTITY_DUPLICATE' as const,
    severity: 'info' as const,
    message: `Possible duplicate entities: ${group.join(', ')}`,
    current: { arc, episode: 0, chapter: 0 },
    details: {
      entities: group,
      suggestion: 'Consider merging or adding aliases',
    },
  }));
}
