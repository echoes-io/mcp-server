import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_EMBEDDING_MODEL, TEST_EMBEDDING_MODEL } from '../../lib/constants.js';
import {
  generateEmbedding,
  generateEmbeddings,
  getEmbeddingDimension,
  getEmbeddingModel,
  resetExtractor,
} from '../../lib/indexer/embeddings.js';

// Use a small, fast model for tests
const TEST_MODEL = TEST_EMBEDDING_MODEL;

describe('embeddings', () => {
  beforeAll(async () => {
    // Pre-load model to cache it (first load is slow)
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
    await generateEmbedding('warmup');
  }, 30000); // 30 second timeout for model download

  beforeEach(() => {
    resetExtractor();
    process.env.ECHOES_EMBEDDING_MODEL = TEST_MODEL;
  });

  afterEach(() => {
    delete process.env.ECHOES_EMBEDDING_MODEL;
  });

  describe('getEmbeddingModel', () => {
    it('returns default when no env var set', () => {
      delete process.env.ECHOES_EMBEDDING_MODEL;
      expect(getEmbeddingModel()).toBe(DEFAULT_EMBEDDING_MODEL);
    });

    it('uses env var when set', () => {
      process.env.ECHOES_EMBEDDING_MODEL = 'custom/model';
      expect(getEmbeddingModel()).toBe('custom/model');
    });
  });

  describe('getEmbeddingDimension', () => {
    it('fetches dimension from model config', async () => {
      const dim = await getEmbeddingDimension(TEST_MODEL);
      expect(dim).toBe(384);
    });

    it('uses default model when not specified', async () => {
      delete process.env.ECHOES_EMBEDDING_MODEL;
      const dim = await getEmbeddingDimension();
      expect(dim).toBe(384); // e5-small-v2 is also 384
    });
  });

  describe('generateEmbedding', () => {
    it('generates embedding for single text', async () => {
      const result = await generateEmbedding('Hello world');

      expect(result).toHaveLength(384);
      expect(typeof result[0]).toBe('number');
      // Normalized vectors should have values roughly between -1 and 1
      expect(Math.abs(result[0])).toBeLessThan(1);
    });

    it('generates different embeddings for different texts', async () => {
      const emb1 = await generateEmbedding('Hello world');
      const emb2 = await generateEmbedding('Goodbye moon');

      // Embeddings should be different
      expect(emb1).not.toEqual(emb2);
    });

    it('generates similar embeddings for similar texts', async () => {
      const emb1 = await generateEmbedding('The cat sat on the mat');
      const emb2 = await generateEmbedding('A cat is sitting on a mat');
      const emb3 = await generateEmbedding('Quantum physics is complex');

      // Cosine similarity helper
      const cosineSim = (a: number[], b: number[]) => {
        const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dot / (normA * normB);
      };

      const simSimilar = cosineSim(emb1, emb2);
      const simDifferent = cosineSim(emb1, emb3);

      // Similar texts should have higher similarity
      expect(simSimilar).toBeGreaterThan(simDifferent);
      expect(simSimilar).toBeGreaterThan(0.5);
    });

    it('uses explicit model when provided', async () => {
      const result = await generateEmbedding('test', TEST_MODEL);
      expect(result).toHaveLength(384);
    });

    it('reuses extractor for same model', async () => {
      // Just verify it doesn't throw and returns consistent results
      const emb1 = await generateEmbedding('text1');
      const emb2 = await generateEmbedding('text1');

      // Same text should give same embedding
      expect(emb1).toEqual(emb2);
    });
  });

  describe('generateEmbeddings', () => {
    it('generates embeddings for multiple texts', async () => {
      const result = await generateEmbeddings(['Hello', 'World']);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(384);
      expect(result[1]).toHaveLength(384);
      expect(result[0]).not.toEqual(result[1]);
    });

    it('returns empty array for empty input', async () => {
      const result = await generateEmbeddings([]);
      expect(result).toEqual([]);
    });

    it('batch results match individual results', async () => {
      const texts = ['First text', 'Second text'];

      const batchResult = await generateEmbeddings(texts);
      resetExtractor();
      const individual1 = await generateEmbedding(texts[0]);
      const individual2 = await generateEmbedding(texts[1]);

      // Batch and individual should produce same results
      expect(batchResult[0]).toEqual(individual1);
      expect(batchResult[1]).toEqual(individual2);
    });
  });

  describe('resetExtractor', () => {
    it('allows reloading model after reset', async () => {
      const emb1 = await generateEmbedding('test');
      resetExtractor();
      const emb2 = await generateEmbedding('test');

      // Should still work and give same result
      expect(emb1).toEqual(emb2);
    });
  });
});
