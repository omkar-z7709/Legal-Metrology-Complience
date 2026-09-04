import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { checkSupabaseConnection } from "../db/supabase.js";

// Throttle the external Supabase liveness check so frequent health pings don't
// each pay a network round-trip.
let cachedStatus: Awaited<ReturnType<typeof checkSupabaseConnection>> | null = null;
let lastCheckedAt = 0;
const HEALTH_CACHE_MS = 10_000;

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/health", async (request, reply) => {
    const now = Date.now();
    if (!cachedStatus || now - lastCheckedAt > HEALTH_CACHE_MS) {
      cachedStatus = await checkSupabaseConnection();
      lastCheckedAt = now;
    }
    const dbStatus = cachedStatus;

    const isHealthy = dbStatus.connected;
    const responsePayload = {
      status: isHealthy ? "healthy" : "degraded",
      service: "legal-metrology-compliance-backend",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      system: {
        memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
      dependencies: {
        supabase: {
          status: dbStatus.connected ? "connected" : "error",
          latencyMs: dbStatus.latencyMs,
          ...(dbStatus.error ? { error: dbStatus.error } : {}),
        },
      },
    };

    // Return 200 even if degraded so health checkers can inspect the json payload, or 503 if strict
    return reply.status(isHealthy ? 200 : 503).send(responsePayload);
  });

  fastify.get("/health/live", async (request, reply) => {
    // Fast liveness probe without external dependency ping
    return reply.status(200).send({
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });
};
