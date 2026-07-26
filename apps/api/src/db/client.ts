import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

pool.on("connect", () => {
  console.log("Database connection established");
});

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function runMigrations() {
  console.log("Running database migrations...");
  // In production, use Flyway or Liquibase
  // For development, migrations should be applied manually or via migration tool
}

export default pool;
