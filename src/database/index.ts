import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as sqliteVec from 'sqlite-vec';

import { relations } from './relations.js';
import * as schema from './schema.js';

export type DatabaseType = ReturnType<typeof drizzle<typeof schema>>;

export async function initDatabase(dbPath: string): Promise<DatabaseType> {
  const client = new Database(dbPath);

  // Enable WAL mode for better concurrency
  client.pragma('journal_mode = WAL');

  // Load sqlite-vec extension
  sqliteVec.load(client);

  const db = drizzle({ client, relations, schema });

  // Auto-migrate on startup
  try {
    await migrate(db, { migrationsFolder: './db' });
    console.log('✅ Database migrations applied successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }

  return db;
}

export { relations } from './relations.js';
// Re-export all schema
export * from './schema.js';
