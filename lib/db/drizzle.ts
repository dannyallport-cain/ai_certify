import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

type Database = ReturnType<typeof drizzle>;
type PostgresClient = ReturnType<typeof postgres>;

function createUnavailableProxy<T extends object>(errorMessage: string): T {
  const fail = () => {
    throw new Error(errorMessage);
  };

  const handler: ProxyHandler<object> = {
    get() {
      return fail;
    },
    set() {
      fail();
      return false;
    },
  };

  return new Proxy({}, handler) as T;
}

const postgresUrl = process.env.POSTGRES_URL;

function createClient(): PostgresClient {
  if (!postgresUrl) {
    return createUnavailableProxy<PostgresClient>(
      'POSTGRES_URL environment variable is not set'
    );
  }

  return postgres(postgresUrl, {
    max: 10, // connection pool size
    idle_timeout: 20, // close idle connections after 20s
    connect_timeout: 30, // wait up to 30s for a connection
    onnotice: () => {}, // suppress collation version mismatch warnings
  });
}

const clientInstance = createClient();

export const client = clientInstance;

export const db: Database = postgresUrl
  ? drizzle(clientInstance, { schema })
  : createUnavailableProxy<Database>(
      'POSTGRES_URL environment variable is not set'
    );
