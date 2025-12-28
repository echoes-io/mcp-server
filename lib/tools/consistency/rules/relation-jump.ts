import { Database } from '../../../database/index.js';
import type { Issue } from '../types.js';

interface RelationChange {
  chapter: string;
  type: string;
  weight: number;
  episode: number;
  chapterNum: number;
}

// Parse chapter ID to get episode and chapter numbers
function parseChapterId(id: string): { episode: number; chapter: number } {
  const parts = id.split(':');
  return {
    episode: Number.parseInt(parts[1], 10) || 0,
    chapter: Number.parseInt(parts[2], 10) || 0,
  };
}

// Check if relation type changed drastically
function isDrasticTypeChange(from: string, to: string): boolean {
  const positive = ['LOVES', 'FRIENDS_WITH', 'KNOWS'];
  const negative = ['HATES', 'ENEMIES_WITH'];

  const fromPositive = positive.includes(from);
  const fromNegative = negative.includes(from);
  const toPositive = positive.includes(to);
  const toNegative = negative.includes(to);

  // Positive to negative or vice versa is drastic
  return (fromPositive && toNegative) || (fromNegative && toPositive);
}

export async function checkRelationJump(dbPath: string, arc: string): Promise<Issue[]> {
  const db = new Database(dbPath);
  await db.connect();

  const relations = await db.getRelations(arc);
  db.close();

  if (relations.length === 0) return [];

  const issues: Issue[] = [];

  // Group relations by source+target pair
  const pairs = new Map<string, RelationChange[]>();

  for (const rel of relations) {
    const key = `${rel.source_entity}:${rel.target_entity}`;

    for (const chapterId of rel.chapters) {
      const { episode, chapter } = parseChapterId(chapterId);

      if (!pairs.has(key)) {
        pairs.set(key, []);
      }

      const pairArray = pairs.get(key);
      if (pairArray) {
        pairArray.push({
          chapter: chapterId,
          type: rel.type,
          weight: rel.weight,
          episode,
          chapterNum: chapter,
        });
      }
    }
  }

  // Check each pair for drastic changes
  for (const [key, changes] of pairs) {
    if (changes.length < 2) continue;

    // Sort by episode, then chapter
    changes.sort((a, b) => {
      if (a.episode !== b.episode) return a.episode - b.episode;
      return a.chapterNum - b.chapterNum;
    });

    // Check consecutive changes
    for (let i = 1; i < changes.length; i++) {
      const prev = changes[i - 1];
      const curr = changes[i];

      // Check for drastic type change
      if (isDrasticTypeChange(prev.type, curr.type)) {
        const [source, target] = key.split(':').map((s) => s.split(':').pop());

        issues.push({
          type: 'RELATION_JUMP',
          severity: 'warning',
          message: `Relation ${source} → ${target} changed from ${prev.type} to ${curr.type}`,
          current: { arc, episode: curr.episode, chapter: curr.chapterNum },
          previous: { arc, episode: prev.episode, chapter: prev.chapterNum },
          details: {
            source,
            target,
            previousType: prev.type,
            currentType: curr.type,
            previousWeight: prev.weight,
            currentWeight: curr.weight,
          },
        });
      }

      // Check for drastic weight drop (>0.5)
      if (prev.type === curr.type && prev.weight - curr.weight > 0.5) {
        const [source, target] = key.split(':').map((s) => s.split(':').pop());

        issues.push({
          type: 'RELATION_JUMP',
          severity: 'info',
          message: `Relation ${source} → ${target} weight dropped from ${prev.weight} to ${curr.weight}`,
          current: { arc, episode: curr.episode, chapter: curr.chapterNum },
          previous: { arc, episode: prev.episode, chapter: prev.chapterNum },
          details: {
            source,
            target,
            type: curr.type,
            previousWeight: prev.weight,
            currentWeight: curr.weight,
          },
        });
      }
    }
  }

  return issues;
}
