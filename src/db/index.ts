import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import * as schema from './schema.js';

mkdirSync('data', { recursive: true });

const client = new DatabaseSync('data/nexus.db');
export const db = drizzle({ client, schema });

migrate(db, { migrationsFolder: 'drizzle' });
