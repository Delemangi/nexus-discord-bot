import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dbCredentials: {
    url: './data/nexus.db',
  },
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/db/schema.ts',
});
