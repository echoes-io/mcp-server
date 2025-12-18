import { eq, sql } from 'drizzle-orm';

import type { DatabaseType } from './index.js';
import { embeddings } from './schema.js';

export interface VectorSearchOptions {
  characters?: string[];
  allCharacters?: boolean;
  arc?: string;
  pov?: string;
  limit?: number;
}

export interface VectorSearchResult {
  id: string;
  chapterId: string;
  content: string;
  characters: string[];
  metadata: Record<string, unknown>;
  similarity: number;
}

export class VectorStore {
  constructor(private db: DatabaseType) {}

  async insert(
    chapterId: string,
    content: string,
    embedding: Float32Array,
    characters: string[] = [],
    metadata: Record<string, unknown> = {},
  ): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.insert(embeddings).values({
      id,
      chapterId,
      content,
      embedding: Buffer.from(embedding.buffer),
      characters: JSON.stringify(characters),
      metadata: JSON.stringify(metadata),
    });

    return id;
  }

  async search(
    queryEmbedding: Float32Array,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    const { characters, allCharacters = false, limit = 10 } = options;

    // Start with base query
    const baseQuery = this.db
      .select({
        id: embeddings.id,
        chapterId: embeddings.chapterId,
        content: embeddings.content,
        characters: embeddings.characters,
        metadata: embeddings.metadata,
        embedding: embeddings.embedding,
      })
      .from(embeddings);

    // Apply character filters if needed
    let query = baseQuery;
    if (characters?.length) {
      if (allCharacters) {
        // All characters must be present (AND)
        for (const char of characters) {
          // @ts-expect-error - Drizzle beta type issues
          query = query.where(sql`json_extract(${embeddings.characters}, '$') LIKE ${`%${char}%`}`);
        }
      } else {
        // At least one character must be present (OR)
        const charConditions = characters.map(
          (char) => sql`json_extract(${embeddings.characters}, '$') LIKE ${`%${char}%`}`,
        );
        // @ts-expect-error - Drizzle beta type issues
        query = query.where(sql`(${sql.join(charConditions, sql` OR `)})`);
      }
    }

    const results = await query;

    // Calculate cosine similarity in JavaScript
    const resultsWithSimilarity = results.map((row) => {
      const rowEmbedding = new Float32Array((row.embedding as Buffer).buffer);
      const similarity = this.cosineSimilarity(queryEmbedding, rowEmbedding);

      return {
        id: row.id,
        chapterId: row.chapterId,
        content: row.content,
        characters: JSON.parse((row.characters as string) || '[]'),
        metadata: JSON.parse((row.metadata as string) || '{}'),
        similarity,
      };
    });

    // Sort by similarity and limit
    return resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async deleteByChapter(chapterId: string): Promise<void> {
    await this.db.delete(embeddings).where(eq(embeddings.chapterId, chapterId));
  }

  async getCharacters(character: string): Promise<string[]> {
    const results = await this.db
      .select({ characters: embeddings.characters })
      .from(embeddings)
      .where(sql`json_extract(${embeddings.characters}, '$') LIKE ${`%${character}%`}`);

    const allCharacters = new Set<string>();

    for (const row of results) {
      const chars = JSON.parse((row.characters as string) || '[]') as string[];
      for (const char of chars) {
        allCharacters.add(char);
      }
    }

    allCharacters.delete(character); // Remove the query character
    return Array.from(allCharacters).sort();
  }
}
