/**
 * Application constants
 */

// Default embedding model for production
export const DEFAULT_EMBEDDING_MODEL = 'Xenova/e5-small-v2';

// Test embedding model (same as default for consistency)
export const TEST_EMBEDDING_MODEL = 'Xenova/e5-small-v2';

// Schema version - bump this when database schema changes require re-indexing
export const SCHEMA_VERSION = 1;

// Default Gemini model
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Default database path
export const DEFAULT_DB_PATH = './db';
