import mysql from 'mysql2/promise';

/**
 * Database connection configuration
 * Required parameters for MySQL/MariaDB connection
 */
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Creates a MySQL connection pool with optimized settings
 * @param config - Database connection parameters
 * @returns Connection pool for executing database queries
 */
export function createDbPool(config: DbConfig) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true, // Queue queries when no connections available
    connectionLimit: 10, // Maximum number of connections in pool
    queueLimit: 0, // No limit on connection queue size
  });
}
