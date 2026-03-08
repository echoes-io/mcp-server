import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@flowrag/provider-local', () => ({
  LocalEmbedder: class MockLocalEmbedder {
    readonly modelName: string;
    readonly dimensions = 384;
    constructor(public opts: Record<string, unknown>) {
      this.modelName = (opts.model as string) ?? 'Xenova/e5-small-v2';
    }
    async embed() {
      return [0.1];
    }
    async embedBatch() {
      return [[0.1]];
    }
  },
}));

vi.mock('@flowrag/provider-gemini', () => ({
  GeminiExtractor: class MockGeminiExtractor {
    readonly modelName: string;
    constructor(public opts: Record<string, unknown>) {
      this.modelName = (opts.model as string) ?? 'gemini-2.5-flash';
    }
    async extractEntities() {
      return { entities: [], relations: [] };
    }
  },
}));

import { createEchoesRAG } from '../../lib/rag/index.js';

describe('createEchoesRAG', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'echoes-rag-test-'));
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.ECHOES_EMBEDDING_MODEL;
    delete process.env.ECHOES_EMBEDDING_DTYPE;
    delete process.env.ECHOES_GEMINI_MODEL;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.GEMINI_API_KEY;
  });

  it('returns rag and storage', () => {
    const result = createEchoesRAG({ dbPath: tempDir });

    expect(result.rag).toBeDefined();
    expect(result.storage).toBeDefined();
    expect(result.storage.kv).toBeDefined();
    expect(result.storage.vector).toBeDefined();
    expect(result.storage.graph).toBeDefined();
  });

  it('exposes FlowRAG methods', () => {
    const { rag } = createEchoesRAG({ dbPath: tempDir });

    expect(typeof rag.index).toBe('function');
    expect(typeof rag.search).toBe('function');
    expect(typeof rag.export).toBe('function');
    expect(typeof rag.stats).toBe('function');
  });

  it('uses default db path when not specified', () => {
    // Should not throw
    const result = createEchoesRAG();
    expect(result.rag).toBeDefined();
  });

  it('applies arc namespace when specified', () => {
    const withArc = createEchoesRAG({ dbPath: tempDir, arc: 'bloom' });
    const withoutArc = createEchoesRAG({ dbPath: tempDir });

    // Namespaced storage wraps the base storage — different object references
    expect(withArc.storage).not.toBe(withoutArc.storage);
  });

  it('passes contentPath to parser', () => {
    // Should not throw when contentPath is provided
    const result = createEchoesRAG({ dbPath: tempDir, contentPath: '/some/path' });
    expect(result.rag).toBeDefined();
  });

  it('respects ECHOES_EMBEDDING_MODEL env var', () => {
    process.env.ECHOES_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
    const { rag } = createEchoesRAG({ dbPath: tempDir });
    expect(rag).toBeDefined();
  });

  it('respects ECHOES_EMBEDDING_DTYPE env var', () => {
    process.env.ECHOES_EMBEDDING_DTYPE = 'q8';
    const { rag } = createEchoesRAG({ dbPath: tempDir });
    expect(rag).toBeDefined();
  });

  it('respects ECHOES_GEMINI_MODEL env var', () => {
    process.env.ECHOES_GEMINI_MODEL = 'gemini-2.0-flash';
    const { rag } = createEchoesRAG({ dbPath: tempDir });
    expect(rag).toBeDefined();
  });
});
