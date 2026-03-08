import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { type StorageSet, withNamespace } from '@flowrag/core';
import { createFlowRAG, type FlowRAG } from '@flowrag/pipeline';
import { GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { LanceDBVectorStorage } from '@flowrag/storage-lancedb';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';

import { DEFAULT_DB_PATH, DEFAULT_EMBEDDING_MODEL } from '../constants.js';
import { EchoesMarkdownParser } from './parser.js';
import { narrativeSchema } from './schema.js';

export interface EchoesRAGOptions {
  dbPath?: string;
  contentPath?: string;
  arc?: string;
}

export interface EchoesRAG {
  rag: FlowRAG;
  storage: StorageSet;
}

export function createEchoesRAG(options: EchoesRAGOptions = {}): EchoesRAG {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  mkdirSync(dbPath, { recursive: true });

  const baseStorage: StorageSet = {
    kv: new JsonKVStorage({ path: join(dbPath, 'kv') }),
    vector: new LanceDBVectorStorage({ path: join(dbPath, 'vectors') }),
    graph: new SQLiteGraphStorage({ path: join(dbPath, 'graph.db') }),
  };

  const storage = options.arc ? withNamespace(baseStorage, options.arc) : baseStorage;

  const embedder = new LocalEmbedder({
    model: process.env.ECHOES_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    dtype: (process.env.ECHOES_EMBEDDING_DTYPE as 'fp32' | 'q8' | 'q4') ?? 'fp32',
  });

  // Lazy extractor: only instantiates GeminiExtractor when actually called
  let _extractor: InstanceType<typeof GeminiExtractor> | undefined;
  /* v8 ignore start -- lazy extractor only used with real Gemini API key */
  const extractor = {
    get modelName() {
      return 'gemini';
    },
    async extractEntities(
      ...args: Parameters<InstanceType<typeof GeminiExtractor>['extractEntities']>
    ) {
      if (!_extractor) _extractor = new GeminiExtractor({ model: process.env.ECHOES_GEMINI_MODEL });
      return _extractor.extractEntities(...args);
    },
  } as InstanceType<typeof GeminiExtractor>;
  /* v8 ignore stop */

  const rag = createFlowRAG({
    schema: narrativeSchema,
    storage,
    embedder,
    extractor,
    parsers: options.contentPath ? [new EchoesMarkdownParser(options.contentPath)] : [],
    options: {
      indexing: {
        chunkSize: Number.MAX_SAFE_INTEGER, // no chunking — one chunk per chapter
      },
    },
  });

  return { rag, storage };
}
