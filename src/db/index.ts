import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';

import * as schema from './schema.js';

mkdirSync('data', { recursive: true });

const sqlite = new BetterSqlite3('data/nexus.db');
export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: 'drizzle' });
