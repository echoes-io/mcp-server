import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/database/schema.ts',
  out: './db',
  dbCredentials: {
    url: './timeline.db',
  },
});
