import { beforeAll, describe, expect, it } from 'vitest';

import type { DatabaseType } from '../../src/database/index.js';
import { initDatabase } from '../../src/database/index.js';
import { DatabaseSync } from '../../src/rag/database-sync.js';

describe('DatabaseSync', () => {
  let db: DatabaseType;
  let dbSync: DatabaseSync;

  beforeAll(async () => {
    db = await initDatabase(':memory:');
    dbSync = new DatabaseSync(db);
  });

  describe('syncChapters', () => {
    it('should sync empty chapters array', async () => {
      const result = await dbSync.syncChapters([]);
      expect(result).toEqual({
        timelines: 0,
        arcs: 0,
        episodes: 0,
        chapters: 0,
      });
    });

    it('should sync single chapter record', async () => {
      const chapters = [
        {
          chapterId: 'test-ch1',
          timeline: 'test-timeline',
          arc: 'test-arc',
          episode: 1,
          chapter: 1,
          pov: 'TestPOV',
          title: 'Test Chapter',
          date: '2024-01-01',
          wordCount: 100,
        },
      ];

      const result = await dbSync.syncChapters(chapters);
      expect(result.timelines).toBe(1);
      expect(result.arcs).toBe(1);
      expect(result.episodes).toBe(1);
      expect(result.chapters).toBe(1);
    });

    it('should handle multiple chapters', async () => {
      const chapters = [
        {
          chapterId: 'multi-ch1',
          timeline: 'multi-timeline',
          arc: 'multi-arc',
          episode: 1,
          chapter: 1,
          pov: 'POV1',
          title: 'Chapter 1',
          date: '2024-01-01',
          wordCount: 100,
        },
        {
          chapterId: 'multi-ch2',
          timeline: 'multi-timeline',
          arc: 'multi-arc',
          episode: 1,
          chapter: 2,
          pov: 'POV2',
          title: 'Chapter 2',
          date: '2024-01-02',
          wordCount: 150,
        },
      ];

      const result = await dbSync.syncChapters(chapters);
      expect(result.timelines).toBe(1);
      expect(result.arcs).toBe(1);
      expect(result.episodes).toBe(1);
      expect(result.chapters).toBe(2);
    });
  });
});
