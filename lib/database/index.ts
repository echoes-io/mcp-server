import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Connection, connect, type Table } from '@lancedb/lancedb';
import type { Schema } from 'apache-arrow';

import { SCHEMA_VERSION } from '../constants.js';
import { getEmbeddingDimension, getEmbeddingModel } from '../indexer/embeddings.js';
import {
  type ChapterRecord,
  createChapterSchema,
  createEntitySchema,
  type EntityRecord,
  type RelationRecord,
  RelationSchema,
} from './schemas.js';

interface TableConfig<T> {
  name: string;
  schema: Schema;
  _phantom?: T;
}

interface Metadata {
  schemaVersion: number;
  embeddingModel: string;
}

export class Database {
  private db: Connection | null = null;
  private tables = new Map<string, Table>();
  private migrationChecked = false;
  private metadata: Metadata | null = null;
  private _embeddingDim: number | null = null;
  private tableConfigs: {
    chapters: TableConfig<ChapterRecord>;
    entities: TableConfig<EntityRecord>;
    relations: TableConfig<RelationRecord>;
  } | null = null;

  private get metadataPath(): string {
    return join(this.dbPath, 'metadata.json');
  }

  constructor(
    public readonly dbPath: string,
    private readonly force = false,
  ) {}

  private async getMetadata(): Promise<Metadata> {
    if (this.metadata) return this.metadata;

    const model = getEmbeddingModel();
    this._embeddingDim = await getEmbeddingDimension(model);

    this.metadata = {
      schemaVersion: SCHEMA_VERSION,
      embeddingModel: model,
    };

    return this.metadata;
  }

  private async getTableConfigs() {
    if (this.tableConfigs) return this.tableConfigs;

    await this.getMetadata();
    const dim = this._embeddingDim ?? 384;

    this.tableConfigs = {
      chapters: { name: 'chapters', schema: createChapterSchema(dim) },
      entities: { name: 'entities', schema: createEntitySchema(dim) },
      relations: { name: 'relations', schema: RelationSchema },
    };

    return this.tableConfigs;
  }

  get embeddingModel(): string {
    if (!this.metadata) throw new Error('Database not connected');
    return this.metadata.embeddingModel;
  }

  get embeddingDim(): number {
    if (!this._embeddingDim) throw new Error('Database not connected');
    return this._embeddingDim;
  }

  private async getConnection(): Promise<Connection> {
    this.db ??= await connect(this.dbPath);
    return this.db;
  }

  private async checkMigration(): Promise<void> {
    if (this.migrationChecked) return;
    this.migrationChecked = true;

    const current = await this.getMetadata();

    if (!existsSync(this.metadataPath)) {
      this.saveMetadata();
      return;
    }

    try {
      const stored: Partial<Metadata> = JSON.parse(readFileSync(this.metadataPath, 'utf-8'));
      const reasons: string[] = [];

      if ((stored.schemaVersion ?? 0) < current.schemaVersion) {
        reasons.push(`schema version ${stored.schemaVersion ?? 0} → ${current.schemaVersion}`);
      }
      if (stored.embeddingModel !== current.embeddingModel) {
        reasons.push(`embedding model ${stored.embeddingModel} → ${current.embeddingModel}`);
      }

      if (reasons.length > 0) {
        if (!this.force) {
          throw new Error(
            `Database migration required: ${reasons.join(', ')}\n` +
              'This requires re-indexing all content. Use --force to confirm and reset the database.',
          );
        }

        console.log(`🔄 Database migration: ${reasons.join(', ')}`);
        console.log('🗑️  Resetting database for re-indexing...');

        const db = await this.getConnection();
        const existingTables = await db.tableNames();
        const configs = await this.getTableConfigs();

        for (const config of Object.values(configs)) {
          if (existingTables.includes(config.name)) {
            await db.dropTable(config.name);
          }
        }

        this.tables.clear();
        this.saveMetadata();
        console.log('✅ Database ready for re-indexing');
      }
    } catch (error) {
      // Re-throw migration errors, only ignore JSON parse errors
      if (error instanceof Error && error.message.includes('Database migration required')) {
        throw error;
      }
      this.saveMetadata();
    }
  }

  private saveMetadata(): void {
    if (!existsSync(this.dbPath)) {
      mkdirSync(this.dbPath, { recursive: true });
    }

    writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
  }

  async connect(): Promise<Connection> {
    await this.checkMigration();
    return this.getConnection();
  }

  private async getTable<T>(config: TableConfig<T>): Promise<Table> {
    const cached = this.tables.get(config.name);
    if (cached) return cached;

    const db = await this.connect();
    const existingTables = await db.tableNames();

    const table = existingTables.includes(config.name)
      ? await db.openTable(config.name)
      : await db.createEmptyTable(config.name, config.schema);

    this.tables.set(config.name, table);
    return table;
  }

  private async upsert<T extends { id: string }>(
    config: TableConfig<T>,
    records: T[],
  ): Promise<number> {
    if (records.length === 0) return 0;

    const table = await this.getTable(config);
    await table.mergeInsert('id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(records);
    return records.length;
  }

  async upsertChapters(records: ChapterRecord[]): Promise<number> {
    const configs = await this.getTableConfigs();
    return this.upsert(configs.chapters, records);
  }

  async upsertEntities(records: EntityRecord[]): Promise<number> {
    const configs = await this.getTableConfigs();
    return this.upsert(configs.entities, records);
  }

  async upsertRelations(records: RelationRecord[]): Promise<number> {
    const configs = await this.getTableConfigs();
    return this.upsert(configs.relations, records);
  }

  async getChapters(arc?: string): Promise<ChapterRecord[]> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.chapters);
      let query = table.query();
      if (arc) {
        query = query.where(`arc = '${arc}'`);
      }
      return (await query.toArray()) as ChapterRecord[];
      /* v8 ignore start */
    } catch {
      return [];
    }
    /* v8 ignore stop */
  }

  async getChapterHashes(): Promise<Map<string, string>> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.chapters);
      const results = await table.query().select(['file_path', 'file_hash']).toArray();
      return new Map(results.map((r) => [r.file_path as string, r.file_hash as string]));
      /* v8 ignore start */
    } catch {
      return new Map();
    }
    /* v8 ignore stop */
  }

  async deleteChaptersByPaths(paths: string[]): Promise<number> {
    if (paths.length === 0) return 0;

    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.chapters);
      const filter = paths.map((p) => `file_path = '${p}'`).join(' OR ');
      await table.delete(filter);
      return paths.length;
      /* v8 ignore start */
    } catch {
      return 0;
    }
    /* v8 ignore stop */
  }

  async searchChapters(vector: number[], limit: number, arc?: string): Promise<ChapterRecord[]> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.chapters);
      let query = table.search(vector).limit(limit);
      if (arc) {
        query = query.where(`arc = '${arc}'`);
      }
      return (await query.toArray()) as ChapterRecord[];
      /* v8 ignore start */
    } catch {
      return [];
    }
    /* v8 ignore stop */
  }

  async searchEntities(
    vector: number[],
    limit: number,
    arc?: string,
    type?: string,
  ): Promise<EntityRecord[]> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.entities);
      let query = table.search(vector).limit(limit);
      if (arc) {
        query = query.where(`arc = '${arc}'`);
      }
      if (type) {
        query = query.where(`type = '${type}'`);
      }
      return (await query.toArray()) as EntityRecord[];
      /* v8 ignore start */
    } catch {
      return [];
    }
    /* v8 ignore stop */
  }

  async getEntities(arc?: string, type?: string): Promise<EntityRecord[]> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.entities);
      let query = table.query();
      const filters: string[] = [];
      if (arc) filters.push(`arc = '${arc}'`);
      if (type) filters.push(`type = '${type}'`);
      if (filters.length > 0) {
        query = query.where(filters.join(' AND '));
      }
      return (await query.toArray()) as EntityRecord[];
      /* v8 ignore start */
    } catch {
      return [];
    }
    /* v8 ignore stop */
  }

  async getRelations(arc?: string, type?: string): Promise<RelationRecord[]> {
    try {
      const configs = await this.getTableConfigs();
      const table = await this.getTable(configs.relations);
      let query = table.query();
      const filters: string[] = [];
      if (arc) filters.push(`arc = '${arc}'`);
      if (type) filters.push(`type = '${type}'`);
      if (filters.length > 0) {
        query = query.where(filters.join(' AND '));
      }
      return (await query.toArray()) as RelationRecord[];
      /* v8 ignore start */
    } catch {
      return [];
    }
    /* v8 ignore stop */
  }

  close(): void {
    this.db = null;
    this.tables.clear();
  }
}
