import { beforeEach, describe, expect, it } from 'vitest';

import { type GraphChunk, type GraphEmbedding, GraphRAG } from '../../src/rag/graph-rag.js';

describe('GraphRAG', () => {
  let graphRAG: GraphRAG;

  beforeEach(() => {
    graphRAG = new GraphRAG(384, 0.7);
  });

  describe('Basic Operations', () => {
    it('should initialize with correct parameters', () => {
      expect(graphRAG.getNodes()).toHaveLength(0);
      expect(graphRAG.getEdges()).toHaveLength(0);
    });

    it('should add nodes correctly', () => {
      const node = {
        id: '1',
        content: 'Test content',
        embedding: new Array(384).fill(0.1),
        metadata: {
          chapterId: 'ch1',
          arc: 'arc1',
          episode: 1,
          chapter: 1,
          pov: 'Alice',
          characters: ['Alice', 'Bob'],
        },
      };

      graphRAG.addNode(node);
      expect(graphRAG.getNodes()).toHaveLength(1);
      expect(graphRAG.getNodes()[0]).toEqual(node);
    });

    it('should throw error for invalid embedding dimension', () => {
      const node = {
        id: '1',
        content: 'Test content',
        embedding: [0.1, 0.2], // Wrong dimension
        metadata: {
          chapterId: 'ch1',
          arc: 'arc1',
          episode: 1,
          chapter: 1,
          pov: 'Alice',
          characters: ['Alice'],
        },
      };

      expect(() => graphRAG.addNode(node)).toThrow('Embedding dimension must be 384');
    });
  });

  describe('Graph Creation', () => {
    it('should create graph from chunks and embeddings', () => {
      const chunks: GraphChunk[] = [
        {
          text: 'Alice walked into the room.',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice'],
            location: 'room',
          },
        },
        {
          text: 'Bob was already there waiting.',
          metadata: {
            chapterId: 'ch2',
            arc: 'arc1',
            episode: 1,
            chapter: 2,
            pov: 'Bob',
            characters: ['Bob'],
            location: 'room',
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [
        { vector: new Array(384).fill(0.1) },
        { vector: new Array(384).fill(0.2) },
      ];

      graphRAG.createGraph(chunks, embeddings);

      expect(graphRAG.getNodes()).toHaveLength(2);
      expect(graphRAG.getEdges().length).toBeGreaterThan(0);
    });

    it('should create temporal edges for sequential chapters', () => {
      const chunks: GraphChunk[] = [
        {
          text: 'Chapter 1 content',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice'],
          },
        },
        {
          text: 'Chapter 2 content',
          metadata: {
            chapterId: 'ch2',
            arc: 'arc1',
            episode: 1,
            chapter: 2,
            pov: 'Alice',
            characters: ['Alice'],
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [
        { vector: new Array(384).fill(0.1) },
        { vector: new Array(384).fill(0.2) },
      ];

      graphRAG.createGraph(chunks, embeddings);

      const temporalEdges = graphRAG.getEdgesByType('temporal');
      expect(temporalEdges.length).toBeGreaterThan(0);
      expect(temporalEdges[0].weight).toBe(0.8);
    });

    it('should create character edges for shared characters', () => {
      const chunks: GraphChunk[] = [
        {
          text: 'Alice and Bob talk',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice', 'Bob', 'Charlie'],
          },
        },
        {
          text: 'Bob and Charlie meet with Alice',
          metadata: {
            chapterId: 'ch2',
            arc: 'arc1',
            episode: 2,
            chapter: 1,
            pov: 'Bob',
            characters: ['Bob', 'Charlie', 'Alice'],
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [
        { vector: new Array(384).fill(0.1) },
        { vector: new Array(384).fill(0.2) },
      ];

      graphRAG.createGraph(chunks, embeddings);

      const characterEdges = graphRAG.getEdgesByType('character');
      expect(characterEdges.length).toBeGreaterThan(0);
    });

    it('should create location edges for same location', () => {
      const chunks: GraphChunk[] = [
        {
          text: 'Scene in the library',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice'],
            location: 'library',
          },
        },
        {
          text: 'Another scene in the library',
          metadata: {
            chapterId: 'ch2',
            arc: 'arc1',
            episode: 2,
            chapter: 1,
            pov: 'Bob',
            characters: ['Bob'],
            location: 'library',
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [
        { vector: new Array(384).fill(0.1) },
        { vector: new Array(384).fill(0.2) },
      ];

      graphRAG.createGraph(chunks, embeddings);

      const locationEdges = graphRAG.getEdgesByType('location');
      expect(locationEdges.length).toBeGreaterThan(0);
      expect(locationEdges[0].weight).toBe(0.6);
    });
  });

  describe('Query and Search', () => {
    beforeEach(() => {
      const chunks: GraphChunk[] = [
        {
          text: 'Alice walked into the room where Bob was waiting.',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice', 'Bob'],
            location: 'room',
          },
        },
        {
          text: 'Charlie entered the library to find Alice reading.',
          metadata: {
            chapterId: 'ch2',
            arc: 'arc1',
            episode: 1,
            chapter: 2,
            pov: 'Charlie',
            characters: ['Charlie', 'Alice'],
            location: 'library',
          },
        },
        {
          text: 'Bob and Charlie discussed the plan in the garden.',
          metadata: {
            chapterId: 'ch3',
            arc: 'arc2',
            episode: 1,
            chapter: 1,
            pov: 'Bob',
            characters: ['Bob', 'Charlie'],
            location: 'garden',
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [
        { vector: new Array(384).fill(0.1) },
        { vector: new Array(384).fill(0.2) },
        { vector: new Array(384).fill(0.3) },
      ];

      graphRAG.createGraph(chunks, embeddings);
    });

    it('should return results for basic query', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({ query, topK: 2 });

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('metadata');
    });

    it('should filter by character (single character)', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({
        query,
        topK: 5,
        characters: ['Alice'],
      });

      results.forEach((result) => {
        expect(result.metadata.characters).toContain('Alice');
      });
    });

    it('should filter by character (all characters must be present)', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({
        query,
        topK: 5,
        characters: ['Alice', 'Bob'],
        allCharacters: true,
      });

      results.forEach((result) => {
        expect(result.metadata.characters).toContain('Alice');
        expect(result.metadata.characters).toContain('Bob');
      });
    });

    it('should filter by arc', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({
        query,
        topK: 5,
        arc: 'arc1',
      });

      results.forEach((result) => {
        expect(result.metadata.arc).toBe('arc1');
      });
    });

    it('should filter by POV', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({
        query,
        topK: 5,
        pov: 'Alice',
      });

      results.forEach((result) => {
        expect(result.metadata.pov).toBe('Alice');
      });
    });

    it('should return empty results for non-matching filters', () => {
      const query = new Array(384).fill(0.15);
      const results = graphRAG.query({
        query,
        topK: 5,
        characters: ['NonExistentCharacter'],
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    it('should clear graph correctly', () => {
      const chunks: GraphChunk[] = [
        {
          text: 'Test content',
          metadata: {
            chapterId: 'ch1',
            arc: 'arc1',
            episode: 1,
            chapter: 1,
            pov: 'Alice',
            characters: ['Alice'],
          },
        },
      ];

      const embeddings: GraphEmbedding[] = [{ vector: new Array(384).fill(0.1) }];

      graphRAG.createGraph(chunks, embeddings);
      expect(graphRAG.getNodes()).toHaveLength(1);

      graphRAG.clear();
      expect(graphRAG.getNodes()).toHaveLength(0);
      expect(graphRAG.getEdges()).toHaveLength(0);
    });

    it('should update node content', () => {
      const node = {
        id: '1',
        content: 'Original content',
        embedding: new Array(384).fill(0.1),
        metadata: {
          chapterId: 'ch1',
          arc: 'arc1',
          episode: 1,
          chapter: 1,
          pov: 'Alice',
          characters: ['Alice'],
        },
      };

      graphRAG.addNode(node);
      graphRAG.updateNodeContent('1', 'Updated content');

      const updatedNode = graphRAG.getNodes().find((n) => n.id === '1');
      expect(updatedNode?.content).toBe('Updated content');
    });
  });
});
