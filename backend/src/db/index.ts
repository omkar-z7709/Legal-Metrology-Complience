import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { env } from "../config/env.js";

// For queries and migrations
const connectionString = env.DATABASE_URL;

// Connection pool configured for serverless / Fastify backend
export const sql = postgres(connectionString, {
  max: env.NODE_ENV === "production" ? 10 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

export * as schema from "./schema.js";

export async function checkPostgresConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const result = await sql`SELECT 1 as health_check`;
    const latencyMs = Date.now() - start;
    if (result && result.length > 0) {
      return { connected: true, latencyMs };
    }
    return { connected: false, latencyMs, error: "Empty query response" };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err.message || "Postgres connection error",
    };
  }
}
