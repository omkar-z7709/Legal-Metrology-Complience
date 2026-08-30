import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { RagLegalService } from "../services/rag/rag.service.js";
import { z } from "zod";

const ragQuerySchema = z.object({
  query: z.string().min(2),
  category: z.string().optional().default("GENERAL"),
});

export const ragRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Semantic / Contextual Rule Retrieval Query (Module 9)
  fastify.post("/rag/query", async (request, reply) => {
    const parseResult = ragQuerySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid RAG query payload", details: parseResult.error.format() },
      });
    }

    const { query, category } = parseResult.data;
    const retrievedContext = await RagLegalService.retrieveLegalContext(query, category);

    return reply.status(200).send({
      success: true,
      data: {
        query,
        category,
        totalRetrieved: retrievedContext.length,
        retrievedContext,
      },
    });
  });

  // 2. GET variant for quick officer lookup
  fastify.get("/rag/query", async (request, reply) => {
    const { q, category } = request.query as { q?: string; category?: string };

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({
        success: false,
        error: { code: "QUERY_REQUIRED", message: "Search query parameter 'q' is required." },
      });
    }

    const retrievedContext = await RagLegalService.retrieveLegalContext(q, category || "GENERAL");

    return reply.status(200).send({
      success: true,
      data: {
        query: q,
        totalRetrieved: retrievedContext.length,
        retrievedContext,
      },
    });
  });
};
