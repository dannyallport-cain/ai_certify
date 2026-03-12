import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const client = postgres(process.env.POSTGRES_URL, {
  max: 10,                // connection pool size
  idle_timeout: 20,       // close idle connections after 20s
  connect_timeout: 30,    // wait up to 30s for a connection
  max_lifetime: 1800,     // recycle connections every 30 minutes
  onnotice: () => {},     // suppress collation version mismatch warnings
});

export const db = drizzle(client, { schema });
