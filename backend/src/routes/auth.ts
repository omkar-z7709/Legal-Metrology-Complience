import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabaseClient } from "../db/supabase.js";
import { authenticate, requireRole, UserRole } from "../middleware/auth.js";

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["INSPECTOR", "SUPERVISOR", "ADMIN"]).optional(),
});

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Login Endpoint
  fastify.post("/auth/login", async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login payload",
          details: parseResult.error.format(),
        },
      });
    }

    const { email, password, role } = parseResult.data;

    // Fast Prototype / Demo Login by Role
    if (role || (email && !password)) {
      const selectedRole: UserRole = role || (email?.includes("admin") ? "ADMIN" : email?.includes("supervisor") ? "SUPERVISOR" : "INSPECTOR");
      const token = `dev-${selectedRole.toLowerCase()}`;
      
      return reply.status(200).send({
        success: true,
        data: {
          token,
          user: {
            email: email || `${selectedRole.toLowerCase()}@lm.gov.in`,
            role: selectedRole,
            name: selectedRole === "INSPECTOR" ? "Sarthak Verma" : selectedRole === "SUPERVISOR" ? "Anita Rao" : "Director General",
            department: "Legal Metrology Enforcement",
          },
        },
      });
    }

    // Live Supabase Auth Login
    if (email && password) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "AUTH_FAILED",
            message: error?.message || "Invalid email or password",
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || "INSPECTOR",
            name: data.user.user_metadata?.name || data.user.email,
          },
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Provide either role or email+password",
      },
    });
  });

  // 2. Profile Me Endpoint (Authenticated)
  fastify.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        user: request.user,
      },
    });
  });

  // 3. Role Protected Test Endpoints
  // Inspector endpoint (INSPECTOR, SUPERVISOR, ADMIN)
  fastify.get(
    "/inspector/scans",
    { preHandler: [authenticate, requireRole(["INSPECTOR", "SUPERVISOR", "ADMIN"])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        message: "Inspector scans accessed successfully",
        userRole: request.user?.role,
      });
    }
  );

  // Supervisor endpoint (SUPERVISOR, ADMIN)
  fastify.get(
    "/supervisor/reviews",
    { preHandler: [authenticate, requireRole(["SUPERVISOR", "ADMIN"])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        message: "Supervisor inspection reviews accessed successfully",
        userRole: request.user?.role,
      });
    }
  );

  // Admin endpoint (ADMIN only)
  fastify.get(
    "/admin/users",
    { preHandler: [authenticate, requireRole(["ADMIN"])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        message: "Admin user management accessed successfully",
        userRole: request.user?.role,
      });
    }
  );
};
