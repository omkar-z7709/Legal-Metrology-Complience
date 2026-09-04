import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import multipart from "@fastify/multipart";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { scanRoutes } from "./routes/scans.js";
import { inspectionRoutes } from "./routes/inspections.js";
import { ruleRoutes } from "./routes/rules.js";
import { ragRoutes } from "./routes/rag.js";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads");

const FILE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

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

  // Static file serving from the local uploads dir with long-lived caching and
  // ETag support. Obfuscated, timestamped filenames; public so browser <img>
  // tags can load them without an Authorization header.
  // Path traversal is blocked by resolving through path.basename().
  app.get("/files/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const fileName = path.basename(decodeURIComponent(name));
    if (!fileName || fileName.includes("..")) {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "File not found." } });
    }

    const filePath = path.join(LOCAL_STORAGE_DIR, fileName);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "File not found." } });
    }

    const contentType =
      FILE_CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;

    if (request.headers["if-none-match"] === etag) {
      return reply.status(304).send();
    }

    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "public, max-age=86400, immutable");
    reply.header("ETag", etag);
    reply.header("Accept-Ranges", "bytes");
    return reply.send(createReadStream(filePath));
  });

  return app;
}
