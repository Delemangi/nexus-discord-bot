import { defineConfig } from 'drizzle-kit';

// drizzle-kit evaluates this config at module load time.
export default defineConfig({
  dbCredentials: {
    url: './data/nexus.db',
  },
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/db/schema.ts',
});
