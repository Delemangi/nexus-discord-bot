import { defineConfig } from 'drizzle-kit';

// drizzle-kit evaluates this config at module load time.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- required by drizzle-kit config discovery
export default defineConfig({
  dbCredentials: {
    url: './data/nexus.db',
  },
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/db/schema.ts',
});
