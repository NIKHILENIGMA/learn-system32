import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/learn_system32";

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_LOCAL_DATABASE_URL;
}

interface GlobalDbCache {
  pgPool?: Pool;
  drizzleDb?: NodePgDatabase<typeof schema>;
}

const globalForDb = globalThis as unknown as GlobalDbCache;

export const pool: Pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30_000,
  });

export const db: NodePgDatabase<typeof schema> =
  globalForDb.drizzleDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
  globalForDb.drizzleDb = db;
}

export * from "./schema";
