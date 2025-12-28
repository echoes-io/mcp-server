import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock embeddings module before importing Database
vi.mock('../lib/indexer/embeddings.js', () => ({
  getEmbeddingModel: vi.fn(() => 'test/model'),
  getEmbeddingDimension: vi.fn(() => Promise.resolve(384)),
  generateEmbedding: vi.fn(() => Promise.resolve(Array(384).fill(0.1))),
  preloadModel: vi.fn(() => Promise.resolve()),
}));

// Mock extractor
vi.mock('../lib/indexer/extractor.js', () => ({
  extractEntities: vi.fn(() => Promise.resolve({ entities: [], relations: [] })),
}));

import { program } from '../cli/program.js';
import { Database } from '../lib/database/index.js';
import type {
  ChapterRecord,
  EntityRecord,
  EntityType,
  RelationRecord,
  RelationType,
} from '../lib/database/schemas.js';

const EMBEDDING_DIM = 384;

const createChapter = (id: string, arc: string, content: string): ChapterRecord => ({
  id,
  file_path: `${arc}/${id}.md`,
  file_hash: 'hash',
  arc,
  episode: 1,
  chapter: 1,
  pov: 'Alice',
  title: 'Test Chapter',
  location: 'Rome',
  date: '',
  content,
  summary: '',
  word_count: content.split(' ').length,
  char_count: content.length,
  paragraph_count: 1,
  vector: Array(EMBEDDING_DIM).fill(0.1),
  entities: [],
  indexed_at: Date.now(),
});

const createEntity = (
  id: string,
  arc: string,
  name: string,
  type: EntityType = 'CHARACTER',
): EntityRecord => ({
  id,
  arc,
  name,
  type,
  description: 'Test entity',
  aliases: [],
  vector: Array(EMBEDDING_DIM).fill(0.1),
  chapters: [],
  chapter_count: 1,
  first_appearance: '',
  indexed_at: Date.now(),
});

const createRelation = (
  id: string,
  arc: string,
  source: string,
  target: string,
  type: RelationType,
): RelationRecord => ({
  id,
  arc,
  source_entity: source,
  target_entity: target,
  type,
  description: 'Test relation',
  weight: 0.5,
  chapters: ['ch1'],
  indexed_at: Date.now(),
});

describe('CLI program', () => {
  it('has correct name and version', () => {
    expect(program.name()).toBe('@echoes-io/mcp-server');
    expect(program.description()).toContain('Model Context Protocol');
    expect(program.version()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('has expected commands', () => {
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('words-count');
    expect(commands).toContain('stats');
    expect(commands).toContain('index');
    expect(commands).toContain('search');
    expect(commands).toContain('serve');
  });

  describe('commands', () => {
    let tempDir: string;
    let consoleLogSpy: Mock<typeof console.log>;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'echoes-cli-test-'));
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true });
      vi.restoreAllMocks();
    });

    describe('words-count', () => {
      it('outputs word count for a file', async () => {
        const filePath = join(tempDir, 'test.md');
        writeFileSync(filePath, 'One two three four five.');

        await program.parseAsync(['node', 'test', 'words-count', filePath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📄'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Words:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('5'));
      });

      it('shows detailed stats with -d flag', async () => {
        const filePath = join(tempDir, 'test.md');
        writeFileSync(filePath, 'First sentence. Second sentence.');

        await program.parseAsync(['node', 'test', 'words-count', '-d', filePath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('💬 Sentences:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📃 Paragraphs:'));
      });

      it('handles multiple files', async () => {
        const file1 = join(tempDir, 'test1.md');
        const file2 = join(tempDir, 'test2.md');
        writeFileSync(file1, 'File one.');
        writeFileSync(file2, 'File two.');

        await program.parseAsync(['node', 'test', 'words-count', file1, file2]);

        // Verifies forEach runs multiple times and adds blank line between files
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test1.md'));
        expect(consoleLogSpy).toHaveBeenCalledWith(''); // blank line between files
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test2.md'));
      });

      it('exits with error on invalid file', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'words-count', '/nonexistent/file.md']);

        expect(mockError).toHaveBeenCalledWith(expect.stringContaining('ENOENT'));
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('stats', () => {
      const createStatsChapter = (
        id: string,
        arc: string,
        pov: string,
        wordCount: number,
      ): ChapterRecord => ({
        id,
        file_path: `${arc}/ch001.md`,
        file_hash: 'hash',
        arc,
        episode: 1,
        chapter: 1,
        pov,
        title: 'Test',
        location: '',
        date: '',
        content: 'Test',
        summary: '',
        word_count: wordCount,
        char_count: 100,
        paragraph_count: 1,
        vector: Array(EMBEDDING_DIM).fill(0),
        entities: [],
        indexed_at: Date.now(),
      });

      it('outputs statistics from database', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertChapters([createStatsChapter('bloom:1:1', 'bloom', 'Alice', 1000)]);
        db.close();

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('📊 Timeline Statistics'),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📚 Chapters:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1,000'));
      });

      it('filters by arc', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertChapters([
          createStatsChapter('bloom:1:1', 'bloom', 'Alice', 1000),
          createStatsChapter('work:1:1', 'work', 'Bob', 2000),
        ]);
        db.close();

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath, '--arc', 'bloom']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1,000'));
      });

      it('shows POVs sorted by count descending', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertChapters([
          createStatsChapter('bloom:1:1', 'bloom', 'Alice', 1000),
          createStatsChapter('bloom:1:2', 'bloom', 'Alice', 1000),
          createStatsChapter('bloom:1:3', 'bloom', 'Bob', 500),
        ]);
        db.close();

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath]);

        // Verify POV output - Alice should come before Bob (2 > 1)
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('👤 POVs:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('alice: 2'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('bob: 1'));
      });

      it('exits with error when no data', async () => {
        const dbPath = join(tempDir, 'db');
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath]);

        expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No indexed chapters'));
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('index', () => {
      it('indexes content directory', async () => {
        const contentDir = join(tempDir, 'content');
        const arcDir = join(contentDir, 'bloom');
        const epDir = join(arcDir, 'ep01-test');
        mkdirSync(epDir, { recursive: true });
        writeFileSync(
          join(epDir, 'ep01-ch001-alice-test.md'),
          '---\narc: bloom\nepisode: 1\nchapter: 1\npov: Alice\ntitle: Test\n---\nContent here.',
        );

        const dbPath = join(tempDir, 'db');
        await program.parseAsync(['node', 'test', 'index', contentDir, '--db', dbPath]);

        // listr2 handles progress output, we just check the summary
        expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Summary');
        expect(consoleLogSpy).toHaveBeenCalledWith('   📖 Indexed:   1 chapters');
      });

      it('exits with error on invalid path', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const dbPath = join(tempDir, 'db');

        await program.parseAsync([
          'node',
          'test',
          'index',
          join(tempDir, 'nonexistent'),
          '--db',
          dbPath,
        ]);

        expect(mockError).toHaveBeenCalledWith(expect.stringContaining('ENOENT'));
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('search', () => {
      it('searches chapters', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertChapters([createChapter('bloom:1:1', 'bloom', 'Alice at the airport')]);
        db.close();

        await program.parseAsync(['node', 'test', 'search', 'airport', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 chapters'));
      });

      it('searches entities', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertEntities([
          createEntity('bloom:CHARACTER:Alice', 'bloom', 'Alice', 'CHARACTER'),
        ]);
        db.close();

        await program.parseAsync([
          'node',
          'test',
          'search',
          'person',
          '--db',
          dbPath,
          '--type',
          'entities',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 entities'));
      });

      it('searches relations', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertRelations([
          createRelation('bloom:Alice:LOVES:Bob', 'bloom', 'Alice', 'Bob', 'LOVES'),
        ]);
        db.close();

        await program.parseAsync([
          'node',
          'test',
          'search',
          'Alice',
          '--db',
          dbPath,
          '--type',
          'relations',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 relations'));
      });

      it('exits with error on invalid type', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const dbPath = join(tempDir, 'db');

        await program.parseAsync([
          'node',
          'test',
          'search',
          'test',
          '--db',
          dbPath,
          '--type',
          'invalid',
        ]);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('list', () => {
      it('lists entities', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertEntities([createEntity('bloom:CHARACTER:Alice', 'bloom', 'Alice')]);
        db.close();

        await program.parseAsync(['node', 'test', 'list', 'entities', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 entities'));
      });

      it('lists relations', async () => {
        const dbPath = join(tempDir, 'db');
        const db = new Database(dbPath);
        await db.upsertRelations([
          createRelation('bloom:Alice:LOVES:Bob', 'bloom', 'Alice', 'Bob', 'LOVES'),
        ]);
        db.close();

        await program.parseAsync(['node', 'test', 'list', 'relations', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 relations'));
      });

      it('exits with error on database failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'list', 'entities', '--db', '/nonexistent/path']);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });
});
