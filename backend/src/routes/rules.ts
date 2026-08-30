import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { RulesService } from "../services/rules/rules.service.js";

export const ruleRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. List All Statutory Rules (with optional category filter)
  fastify.get("/rules", async (request, reply) => {
    const { category } = request.query as { category?: string };

    const rules = category
      ? await RulesService.getApplicableRules(category)
      : await RulesService.getAllActiveRules();

    return reply.status(200).send({
      success: true,
      data: {
        total: rules.length,
        rules,
      },
    });
  });

  // 2. Get Specific Rule by ID
  fastify.get("/rules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await RulesService.getRuleById(id);

    if (!rule) {
      return reply.status(404).send({
        success: false,
        error: { code: "RULE_NOT_FOUND", message: `Rule '${id}' not found in knowledge base.` },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        rule,
      },
    });
  });
};
