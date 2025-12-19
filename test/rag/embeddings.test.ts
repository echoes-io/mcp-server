import { describe, expect, it } from 'vitest';

import {
  BGEBaseEmbedding,
  batchArray,
  cosineSimilarity,
  createEmbeddingProvider,
  E5SmallEmbedding,
  normalizeEmbedding,
} from '../../src/rag/embeddings.js';

describe('Embedding Utilities', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between identical vectors', () => {
      const vec = [1, 2, 3];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate cosine similarity between orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should calculate cosine similarity between opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for vectors of different lengths', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize a vector to unit length', () => {
      const vec = [3, 4];
      const normalized = normalizeEmbedding(vec);
      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
    });

    it('should handle already normalized vectors', () => {
      const vec = [1, 0];
      const normalized = normalizeEmbedding(vec);
      expect(normalized[0]).toBeCloseTo(1.0, 5);
      expect(normalized[1]).toBeCloseTo(0.0, 5);
    });
  });

  describe('batchArray', () => {
    it('should split array into batches of specified size', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const batches = batchArray(arr, 3);
      expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      const batches = batchArray(arr, 3);
      expect(batches).toEqual([]);
    });

    it('should handle batch size larger than array', () => {
      const arr = [1, 2, 3];
      const batches = batchArray(arr, 10);
      expect(batches).toEqual([[1, 2, 3]]);
    });
  });
});

describe('Embedding Providers', () => {
  describe('BGEBaseEmbedding', () => {
    it('should create BGE embedding provider with correct dimensions', () => {
      const embedder = new BGEBaseEmbedding();
      expect(embedder.name).toBe('bge-base-en-v1.5');
      expect(embedder.dimension).toBe(384);
    });

    it('should generate embeddings for texts', async () => {
      const embedder = new BGEBaseEmbedding();
      const texts = ['hello world', 'test text'];
      const embeddings = await embedder.embed(texts);

      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toHaveLength(384);
      expect(embeddings[1]).toHaveLength(384);
    });

    it('should generate single embedding', async () => {
      const embedder = new BGEBaseEmbedding();
      const embedding = await embedder.embedSingle('test');

      expect(embedding).toHaveLength(384);
    });
  });

  describe('E5SmallEmbedding', () => {
    it('should create E5 embedding provider with correct dimensions', () => {
      const embedder = new E5SmallEmbedding();
      expect(embedder.name).toBe('e5-small-v2');
      expect(embedder.dimension).toBe(384);
    });

    it('should generate embeddings for texts', async () => {
      const embedder = new E5SmallEmbedding();
      const texts = ['hello world', 'test text'];
      const embeddings = await embedder.embed(texts);

      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toHaveLength(384);
      expect(embeddings[1]).toHaveLength(384);
    });
  });

  describe('createEmbeddingProvider', () => {
    it('should create E5 provider when specified', () => {
      const embedder = createEmbeddingProvider({ provider: 'e5-small' });
      expect(embedder.name).toBe('e5-small-v2');
    });

    it('should create BGE provider when explicitly specified', () => {
      const embedder = createEmbeddingProvider({ provider: 'bge-base' });
      expect(embedder.name).toBe('bge-base-en-v1.5');
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        createEmbeddingProvider({ provider: 'unknown' as 'bge-base' });
      }).toThrow('Unknown embedding provider: unknown');
    });
  });
});
