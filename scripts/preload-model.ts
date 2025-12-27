#!/usr/bin/env tsx

/**
 * Pre-download embedding model for CI to avoid download failures during tests
 */

import { pipeline } from '@huggingface/transformers';

import { DEFAULT_EMBEDDING_MODEL } from '../lib/constants.js';

console.log('🔄 Pre-downloading embedding model:', DEFAULT_EMBEDDING_MODEL);

try {
  await pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL);
  console.log('✅ Model cached successfully');
} catch (error) {
  console.error(
    '❌ Model download failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
