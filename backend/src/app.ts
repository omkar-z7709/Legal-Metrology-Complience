import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import multipart from "@fastify/multipart";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { scanRoutes } from "./routes/scans.js";
import { inspectionRoutes } from "./routes/inspections.js";
import { ruleRoutes } from "./routes/rules.js";
import { ragRoutes } from "./routes/rag.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  // Security & Utilities
  app.register(sensible);
  app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Multipart file upload support
  app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB
    },
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: {
        message: error.message || "Internal Server Error",
        statusCode,
        code: error.code || "INTERNAL_ERROR",
      },
    });
  });

  // Root & Routes
  app.register(healthRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(scanRoutes, { prefix: "/api" });
  app.register(inspectionRoutes, { prefix: "/api" });
  app.register(ruleRoutes, { prefix: "/api" });
  app.register(ragRoutes, { prefix: "/api" });

  app.get("/", async () => {
    return {
      name: "AI Legal Metrology Compliance API",
      status: "running",
      documentation: "/api/health",
      version: "0.1.0",
    };
  });

  return app;
}
