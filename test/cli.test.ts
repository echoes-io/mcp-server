import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('@flowrag/provider-local', () => ({
  LocalEmbedder: class {
    readonly modelName = 'test';
    readonly dimensions = 3;
    async embed() {
      return [0.1, 0.2, 0.3];
    }
    async embedBatch(texts: string[]) {
      return texts.map(() => [0.1, 0.2, 0.3]);
    }
  },
}));

vi.mock('@flowrag/provider-gemini', () => ({
  GeminiExtractor: class {
    readonly modelName = 'test';
    async extractEntities() {
      return { entities: [], relations: [] };
    }
  },
}));

import { program } from '../cli/program.js';
import { createEchoesRAG } from '../lib/rag/index.js';

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

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test1.md'));
        expect(consoleLogSpy).toHaveBeenCalledWith('');
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
      async function seedStatsChapters(
        dbPath: string,
        chapters: Array<{ arc: string; pov: string; wordCount: number }>,
      ) {
        for (const ch of chapters) {
          const { storage } = createEchoesRAG({ dbPath, arc: ch.arc });
          await storage.kv.set(`doc:${ch.arc}:1:${chapters.indexOf(ch) + 1}`, {
            metadata: {
              fields: {
                arc: ch.arc,
                episode: '1',
                chapter: String(chapters.indexOf(ch) + 1),
                pov: ch.pov,
                title: 'Test',
                location: '',
                date: '',
                word_count: String(ch.wordCount),
              },
            },
          });
        }
      }

      it('outputs statistics from database', async () => {
        const dbPath = join(tempDir, 'db');
        await seedStatsChapters(dbPath, [{ arc: 'bloom', pov: 'Alice', wordCount: 1000 }]);

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('📊 Timeline Statistics'),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📚 Chapters:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1,000'));
      });

      it('filters by arc', async () => {
        const dbPath = join(tempDir, 'db');
        await seedStatsChapters(dbPath, [
          { arc: 'bloom', pov: 'Alice', wordCount: 1000 },
          { arc: 'work', pov: 'Bob', wordCount: 2000 },
        ]);

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath, '--arc', 'bloom']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1,000'));
      });

      it('shows POVs sorted by count descending', async () => {
        const dbPath = join(tempDir, 'db');
        await seedStatsChapters(dbPath, [
          { arc: 'bloom', pov: 'Alice', wordCount: 1000 },
          { arc: 'bloom', pov: 'Alice', wordCount: 1000 },
          { arc: 'bloom', pov: 'Bob', wordCount: 500 },
        ]);

        await program.parseAsync(['node', 'test', 'stats', '--db', dbPath]);

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
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.vector.upsert([
          {
            id: 'bloom:1:1',
            vector: [0.1, 0.2, 0.3],
            metadata: {
              _kind: 'chunk',
              arc: 'bloom',
              episode: '1',
              chapter: '1',
              pov: 'Alice',
              title: 'Test',
              location: 'Airport',
              date: '',
              file_path: 'bloom/ch1.md',
              file_hash: 'h',
              word_count: '10',
            },
          },
        ]);

        await program.parseAsync(['node', 'test', 'search', 'airport', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 chapters'));
      });

      it('searches entities', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.vector.upsert([
          {
            id: 'entity:CHARACTER:Alice',
            vector: [0.1, 0.2, 0.3],
            metadata: { _kind: 'entity', entityId: 'CHARACTER:Alice' },
          },
        ]);

        await program.parseAsync([
          'node',
          'test',
          'search',
          'person',
          '--db',
          dbPath,
          '--type',
          'entities',
          '--arc',
          'bloom',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 entities'));
      });

      it('searches relations', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addEntity({
          id: 'CHARACTER:Bob',
          name: 'Bob',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addRelation({
          id: 'r1',
          sourceId: 'CHARACTER:Alice',
          targetId: 'CHARACTER:Bob',
          type: 'LOVES',
          description: 'Alice loves Bob',
          keywords: [],
          sourceChunkIds: ['1:1'],
        });

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
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        await program.parseAsync(['node', 'test', 'list', 'entities', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 entities'));
      });

      it('lists relations', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addEntity({
          id: 'CHARACTER:Bob',
          name: 'Bob',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addRelation({
          id: 'r1',
          sourceId: 'CHARACTER:Alice',
          targetId: 'CHARACTER:Bob',
          type: 'LOVES',
          description: 'Test',
          keywords: [],
          sourceChunkIds: ['1:1'],
        });

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

    describe('history', () => {
      it('outputs history for an arc', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.kv.set('doc:1:1', {
          metadata: {
            fields: {
              arc: 'bloom',
              episode: 1,
              chapter: 1,
              pov: 'Alice',
              title: 'Ch1',
              location: 'Park',
              kink: 'primo bondage',
              outfit: 'Alice: red dress',
            },
          },
        });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addEntity({
          id: 'CHARACTER:Bob',
          name: 'Bob',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });
        await storage.graph.addRelation({
          id: 'r1',
          sourceId: 'CHARACTER:Alice',
          targetId: 'CHARACTER:Bob',
          type: 'LOVES',
          description: 'Test',
          keywords: [],
          sourceChunkIds: ['1:1'],
        });

        await program.parseAsync(['node', 'test', 'history', 'bloom', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Arc History'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Kinks'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Outfits'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Locations'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Relations'));
      });

      it('shows empty message when no history', async () => {
        const dbPath = join(tempDir, 'db');
        createEchoesRAG({ dbPath, arc: 'bloom' });

        await program.parseAsync(['node', 'test', 'history', 'bloom', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No history found'));
      });

      it('exits with error on failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'history', 'bloom', '--db', '/nonexistent/path']);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('graph', () => {
      it('exports graph in json format', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        await program.parseAsync([
          'node',
          'test',
          'graph',
          'bloom',
          '--format',
          'json',
          '--db',
          dbPath,
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
      });

      it('exits with error on failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'graph', 'bloom', '--db', '/nonexistent/path']);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('review-generate', () => {
      it('generates review file', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        const outputFile = join(tempDir, 'review.yaml');
        await program.parseAsync([
          'node',
          'test',
          'review-generate',
          'bloom',
          '--output',
          outputFile,
          '--db',
          dbPath,
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Review file generated'),
        );
      });

      it('exits with error on failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync([
          'node',
          'test',
          'review-generate',
          'bloom',
          '--db',
          '/nonexistent/path',
        ]);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('review-status', () => {
      it('shows review status', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        await program.parseAsync(['node', 'test', 'review-status', 'bloom', '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Review Status'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Entities'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Relations'));
      });

      it('exits with error on failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync([
          'node',
          'test',
          'review-status',
          'bloom',
          '--db',
          '/nonexistent/path',
        ]);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('review-apply', () => {
      it('applies review file in dry-run mode', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'bloom:CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        const reviewFile = join(tempDir, 'review.yaml');
        writeFileSync(
          reviewFile,
          'entities:\n  - id: bloom:CHARACTER:Alice\n    name: Alice\n    type: CHARACTER\n    description: Test\n    status: approved\n',
        );

        await program.parseAsync([
          'node',
          'test',
          'review-apply',
          reviewFile,
          '--dry-run',
          '--db',
          dbPath,
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
      });

      it('applies review file', async () => {
        const dbPath = join(tempDir, 'db');
        const { storage } = createEchoesRAG({ dbPath, arc: 'bloom' });
        await storage.graph.addEntity({
          id: 'bloom:CHARACTER:Alice',
          name: 'Alice',
          type: 'CHARACTER',
          description: 'Test',
          sourceChunkIds: ['1:1'],
        });

        const reviewFile = join(tempDir, 'review.yaml');
        writeFileSync(
          reviewFile,
          'entities:\n  - id: bloom:CHARACTER:Alice\n    name: Alice\n    type: CHARACTER\n    description: Test\n    status: approved\n',
        );

        await program.parseAsync(['node', 'test', 'review-apply', reviewFile, '--db', dbPath]);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Applied changes'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Details'));
      });

      it('exits with error on failure', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync([
          'node',
          'test',
          'review-apply',
          '/nonexistent/file.yaml',
          '--db',
          join(tempDir, 'db'),
        ]);

        expect(mockError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });
});
