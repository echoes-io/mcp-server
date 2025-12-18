/**
 * GraphRAG implementation for Echoes storytelling platform
 * Based on Mastra.ai GraphRAG with adaptations for chapter relationships
 */

export type SupportedEdgeType = 'semantic' | 'character' | 'temporal' | 'location';

export interface GraphNode {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    chapterId: string;
    arc: string;
    episode: number;
    chapter: number;
    pov: string;
    characters: string[];
    location?: string;
    [key: string]: unknown;
  };
}

export interface RankedNode extends GraphNode {
  score: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: SupportedEdgeType;
}

export interface GraphChunk {
  text: string;
  metadata: GraphNode['metadata'];
}

export interface GraphEmbedding {
  vector: number[];
}

export class GraphRAG {
  private nodes: Map<string, GraphNode>;
  private edges: GraphEdge[];
  private dimension: number;
  private threshold: number;

  constructor(dimension: number = 384, threshold: number = 0.7) {
    this.nodes = new Map();
    this.edges = [];
    this.dimension = dimension;
    this.threshold = threshold;
  }

  // Add a node to the graph
  addNode(node: GraphNode): void {
    if (!node.embedding) {
      throw new Error('Node must have an embedding');
    }
    if (node.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension must be ${this.dimension}`);
    }
    this.nodes.set(node.id, node);
  }

  // Add an edge between two nodes
  addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error('Both source and target nodes must exist');
    }
    this.edges.push(edge);

    // Add reverse edge for undirected relationships
    if (edge.type === 'semantic' || edge.type === 'character') {
      this.edges.push({
        source: edge.target,
        target: edge.source,
        weight: edge.weight,
        type: edge.type,
      });
    }
  }

  // Helper methods
  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  getEdgesByType(type: SupportedEdgeType): GraphEdge[] {
    return this.edges.filter((edge) => edge.type === type);
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }

  updateNodeContent(id: string, newContent: string): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node ${id} not found`);
    }
    node.content = newContent;
  }

  // Get neighbors of a node
  private getNeighbors(
    nodeId: string,
    edgeType?: SupportedEdgeType,
  ): { id: string; weight: number }[] {
    return this.edges
      .filter((edge) => edge.source === nodeId && (!edgeType || edge.type === edgeType))
      .map((edge) => ({
        id: edge.target,
        weight: edge.weight,
      }));
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2) {
      throw new Error('Vectors must not be null or undefined');
    }
    if (vec1.length !== vec2.length) {
      throw new Error(
        `Vector dimensions must match: vec1(${vec1.length}) !== vec2(${vec2.length})`,
      );
    }

    let dotProduct = 0;
    let normVec1 = 0;
    let normVec2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const a = vec1[i];
      const b = vec2[i];
      dotProduct += a * b;
      normVec1 += a * a;
      normVec2 += b * b;
    }

    const magnitudeProduct = Math.sqrt(normVec1 * normVec2);
    if (magnitudeProduct === 0) return 0;

    const similarity = dotProduct / magnitudeProduct;
    return Math.max(-1, Math.min(1, similarity));
  }

  // Create graph from chapters with multiple edge types
  createGraph(chunks: GraphChunk[], embeddings: GraphEmbedding[]): void {
    if (!chunks?.length || !embeddings?.length) {
      throw new Error('Chunks and embeddings arrays must not be empty');
    }
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings must have the same length');
    }

    // Create nodes from chunks
    chunks.forEach((chunk, index) => {
      const node: GraphNode = {
        id: index.toString(),
        content: chunk.text,
        embedding: embeddings[index]?.vector,
        metadata: chunk.metadata,
      };
      this.addNode(node);
    });

    // Create semantic edges based on cosine similarity (high threshold)
    this.createSemanticEdges(embeddings);

    // Create character relationship edges
    this.createCharacterEdges();

    // Create temporal edges (sequential chapters)
    this.createTemporalEdges();

    // Create location edges
    this.createLocationEdges();
  }

  private createSemanticEdges(embeddings: GraphEmbedding[]): void {
    for (let i = 0; i < embeddings.length; i++) {
      const firstEmbedding = embeddings[i]?.vector;
      for (let j = i + 1; j < embeddings.length; j++) {
        const secondEmbedding = embeddings[j]?.vector;
        const similarity = this.cosineSimilarity(firstEmbedding, secondEmbedding);

        if (similarity > this.threshold) {
          this.addEdge({
            source: i.toString(),
            target: j.toString(),
            weight: similarity,
            type: 'semantic',
          });
        }
      }
    }
  }

  private createCharacterEdges(): void {
    const nodes = Array.from(this.nodes.values());

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        // Find common characters (only real character names, not noise)
        const chars1 = new Set(
          node1.metadata.characters.filter(
            (char) => char.length >= 3 && char[0] === char[0].toUpperCase(),
          ),
        );
        const chars2 = new Set(
          node2.metadata.characters.filter(
            (char) => char.length >= 3 && char[0] === char[0].toUpperCase(),
          ),
        );

        const commonChars = [...chars1].filter((char) => chars2.has(char));

        // Only create edge if there are 2+ common characters (meaningful relationship)
        if (commonChars.length >= 2) {
          // Weight based on number of common characters, but capped
          const weight = Math.min(commonChars.length / Math.max(chars1.size, chars2.size), 0.8);

          this.addEdge({
            source: node1.id,
            target: node2.id,
            weight: weight,
            type: 'character',
          });
        }
      }
    }
  }

  private createTemporalEdges(): void {
    const nodes = Array.from(this.nodes.values());

    // Group by arc and episode
    const episodeGroups = new Map<string, GraphNode[]>();

    nodes.forEach((node) => {
      const key = `${node.metadata.arc}-${node.metadata.episode}`;
      if (!episodeGroups.has(key)) {
        episodeGroups.set(key, []);
      }
      episodeGroups.get(key)?.push(node);
    });

    // Create temporal edges within episodes
    episodeGroups.forEach((episodeNodes) => {
      episodeNodes.sort((a, b) => a.metadata.chapter - b.metadata.chapter);

      for (let i = 0; i < episodeNodes.length - 1; i++) {
        this.addEdge({
          source: episodeNodes[i].id,
          target: episodeNodes[i + 1].id,
          weight: 0.8, // High weight for sequential chapters
          type: 'temporal',
        });
      }
    });
  }

  private createLocationEdges(): void {
    const nodes = Array.from(this.nodes.values());

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        if (
          node1.metadata.location &&
          node2.metadata.location &&
          node1.metadata.location === node2.metadata.location
        ) {
          this.addEdge({
            source: node1.id,
            target: node2.id,
            weight: 0.6, // Moderate weight for same location
            type: 'location',
          });
        }
      }
    }
  }

  // Weighted random neighbor selection for random walk
  private selectWeightedNeighbor(neighbors: Array<{ id: string; weight: number }>): string {
    const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
    let remainingWeight = Math.random() * totalWeight;

    for (const neighbor of neighbors) {
      remainingWeight -= neighbor.weight;
      if (remainingWeight <= 0) {
        return neighbor.id;
      }
    }

    return neighbors[neighbors.length - 1]?.id || '';
  }

  // Random walk with restart for node ranking
  private randomWalkWithRestart(
    startNodeId: string,
    steps: number,
    restartProb: number,
    allowedNodeIds?: Set<string>,
  ): Map<string, number> {
    const visits = new Map<string, number>();
    let currentNodeId = startNodeId;

    for (let step = 0; step < steps; step++) {
      visits.set(currentNodeId, (visits.get(currentNodeId) || 0) + 1);

      if (Math.random() < restartProb) {
        currentNodeId = startNodeId;
        continue;
      }

      let neighbors = this.getNeighbors(currentNodeId);
      if (allowedNodeIds) {
        neighbors = neighbors.filter((n) => allowedNodeIds.has(n.id));
      }

      if (neighbors.length === 0) {
        currentNodeId = startNodeId;
        continue;
      }

      currentNodeId = this.selectWeightedNeighbor(neighbors);
    }

    // Normalize visits
    const totalVisits = Array.from(visits.values()).reduce((a, b) => a + b, 0);
    const normalizedVisits = new Map<string, number>();

    for (const [nodeId, count] of visits) {
      normalizedVisits.set(nodeId, count / totalVisits);
    }

    return normalizedVisits;
  }

  // Main query method with character and metadata filtering
  query({
    query,
    topK = 10,
    randomWalkSteps = 100,
    restartProb = 0.15,
    characters,
    allCharacters = false,
    arc,
    pov,
  }: {
    query: number[];
    topK?: number;
    randomWalkSteps?: number;
    restartProb?: number;
    characters?: string[];
    allCharacters?: boolean;
    arc?: string;
    pov?: string;
  }): RankedNode[] {
    if (!query || query.length !== this.dimension) {
      throw new Error(`Query embedding must have dimension ${this.dimension}`);
    }

    // Filter nodes based on metadata
    const nodesToSearch = Array.from(this.nodes.values()).filter((node) => {
      // Arc filter
      if (arc && node.metadata.arc !== arc) return false;

      // POV filter
      if (pov && node.metadata.pov !== pov) return false;

      // Character filter
      if (characters?.length) {
        const nodeChars = new Set(node.metadata.characters);
        if (allCharacters) {
          // All characters must be present
          return characters.every((char) => nodeChars.has(char));
        } else {
          // At least one character must be present
          return characters.some((char) => nodeChars.has(char));
        }
      }

      return true;
    });

    if (nodesToSearch.length === 0) {
      return [];
    }

    // Calculate initial similarities
    const similarities = nodesToSearch
      .filter((node): node is GraphNode & { embedding: number[] } => !!node.embedding)
      .map((node) => ({
        node,
        similarity: this.cosineSimilarity(query, node.embedding),
      }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topNodes = similarities.slice(0, topK);

    // Re-rank using random walk
    const allowedNodeIds = new Set(nodesToSearch.map((n) => n.id));
    const rerankedNodes = new Map<string, { node: GraphNode; score: number }>();

    for (const { node, similarity } of topNodes) {
      const walkScores = this.randomWalkWithRestart(
        node.id,
        randomWalkSteps,
        restartProb,
        allowedNodeIds,
      );

      for (const [nodeId, walkScore] of walkScores) {
        const graphNode = this.nodes.get(nodeId);
        if (!graphNode) continue;

        const existingScore = rerankedNodes.get(nodeId)?.score || 0;

        rerankedNodes.set(nodeId, {
          node: graphNode,
          score: existingScore + similarity * walkScore,
        });
      }
    }

    // Return final ranked results
    return Array.from(rerankedNodes.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => ({
        ...item.node,
        score: item.score,
      }));
  }
}
