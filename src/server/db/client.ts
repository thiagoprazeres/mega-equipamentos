import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getDatabaseUrl } from '../runtime-config';
import * as schema from './schema';

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let sqlClient: postgres.Sql | null = null;
let dbClient: DbClient | null = null;

export function getDb(): DbClient {
  if (dbClient) {
    return dbClient;
  }

  sqlClient = postgres(getDatabaseUrl(), {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  dbClient = drizzle(sqlClient, { schema });

  return dbClient;
}
