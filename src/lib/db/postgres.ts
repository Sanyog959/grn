import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;

  if (
    !connectionString ||
    connectionString.includes('[YOUR-PASSWORD]') ||
    !connectionString.startsWith('postgres')
  ) {
    return null;
  }

  if (pool) {
    return pool;
  }

  const config: PoolConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  return pool;
}
