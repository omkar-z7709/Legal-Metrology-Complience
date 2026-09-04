import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { env } from "../config/env.js";

// For queries and migrations
const connectionString = env.DATABASE_URL;

// Connection pool configured for serverless / Fastify backend.
// `max_lifetime` prevents the postgres driver from recycling the socket while
// keeping idle Neon/pgbouncer connections alive, eliminating frequent cold
// starts. `idle_timeout: 0` keeps the pooled connection warm between requests.
export const sql = postgres(connectionString, {
  max: env.NODE_ENV === "production" ? 10 : 3,
  idle_timeout: 0,
  connect_timeout: 10,
  max_lifetime: 60 * 60, // hold sockets up to 1 hour instead of recycling after 20s
  connection: {
    application_name: "legal-metrology-backend",
  },
});

export const db = drizzle(sql, { schema });

// Cache for health / liveness checks to avoid a per-request `SELECT 1`
let lastCheck = 0;
let cachedHealthy: boolean | null = null;

export async function checkPostgresConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  // Refresh the cached status at most once every 5 seconds so repeated calls
  // (e.g. per RAG query, per repo method) don't each incur a DB round-trip.
  const now = Date.now();
  if (cachedHealthy !== null && now - lastCheck < 5000) {
    return { connected: cachedHealthy, latencyMs: 0 };
  }
  const start = Date.now();
  try {
    const result = await sql`SELECT 1 as health_check`;
    const latencyMs = Date.now() - start;
    const connected = !!(result && result.length > 0);
    lastCheck = now;
    cachedHealthy = connected;
    if (!connected) {
      return { connected: false, latencyMs, error: "Empty query response" };
    }
    return { connected: true, latencyMs };
  } catch (err: any) {
    lastCheck = now;
    cachedHealthy = false;
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err.message || "Postgres connection error",
    };
  }
}

export * as schema from "./schema.js";
