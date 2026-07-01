import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const POSTGRES_URL = process.env.POSTGRES_URL;

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createMissingEnvError() {
  return new Error(
    'POSTGRES_URL environment variable is not set. Add it to your local environment (e.g. .env.local) before using database-backed features.'
  );
}

function ensureDb() {
  if (!POSTGRES_URL) {
    throw createMissingEnvError();
  }

  if (!_client) {
    _client = postgres(POSTGRES_URL, {
      max: 10,              // connection pool size
      idle_timeout: 20,     // close idle connections after 20s
      connect_timeout: 30,  // wait up to 30s for a connection
      onnotice: () => {},   // suppress collation version mismatch warnings
    });
  }

  if (!_db) {
    _db = drizzle(_client, { schema });
  }

  return { client: _client, db: _db };
}

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureDb().client as object, prop, receiver);
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureDb().db as object, prop, receiver);
  },
});

export function getDb() {
  return ensureDb().db;
}

export function getClient() {
  return ensureDb().client;
}
