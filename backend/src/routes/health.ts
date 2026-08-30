import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { checkSupabaseConnection } from "../db/supabase.js";

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/health", async (request, reply) => {
    const dbStatus = await checkSupabaseConnection();

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
