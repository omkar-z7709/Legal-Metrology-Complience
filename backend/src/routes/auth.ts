import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabaseClient, supabaseAdmin } from "../db/supabase.js";
import { authenticate, requireRole, UserRole } from "../middleware/auth.js";
import { DBRepo } from "../db/repo.js";

const loginSchema = z.object({
  email: z.string().email("A valid official email is required"),
  password: z.string().min(1, "Password is required"),
});

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * 1. Official Officer Login Endpoint
   * Authenticates against Supabase Auth, then verifies officer authorization and active status.
   */
  fastify.post("/auth/login", async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login payload. Please provide both email and password.",
          details: parseResult.error.format(),
        },
      });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    let authData: any = null;
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data?.session) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid official email or password.",
          },
        });
      }

      authData = data;
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "AUTH_FAILED",
          message: err.message || "Authentication service error.",
        },
      });
    }

    // 2. Query authorized_officers table to ensure official is approved
    const officer = await DBRepo.getAuthorizedOfficerByEmail(normalizedEmail);

    // 3. Reject if not found in authorized officers whitelist
    if (!officer) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "OFFICER_NOT_AUTHORIZED",
          message: "Access Denied: This account is not registered as an authorized government officer.",
        },
      });
    }

    // 4. Reject if officer is inactive / suspended
    const isActive = officer.is_active !== undefined ? officer.is_active : officer.isActive;
    if (!isActive) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "OFFICER_ACCOUNT_INACTIVE",
          message: "Access Denied: Your official officer account is currently inactive or suspended.",
        },
      });
    }

    // 5. Return trusted officer data and Supabase access token
    return reply.status(200).send({
      success: true,
      data: {
        token: authData.session.access_token,
        user: {
          id: officer.id || authData.user.id,
          email: officer.email,
          role: officer.role as UserRole,
          name: officer.name,
          department: officer.department || "Legal Metrology Enforcement",
        },
      },
    });
  });

  /**
   * 2. Profile Me Endpoint (Authenticated)
   */
  fastify.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        user: request.user,
      },
    });
  });

  /**
   * 3. Role Protected Verification Endpoints
   */
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
