import { FastifyRequest, FastifyReply } from "fastify";
import { supabaseClient, supabaseAdmin } from "../db/supabase.js";
import { DBRepo } from "../db/repo.js";

export type UserRole = "INSPECTOR" | "SUPERVISOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  department?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Authentication Middleware:
 * 1. Extracts & validates Supabase JWT Bearer token.
 * 2. Whitelist Verification: Ensures authenticated user is in `authorized_officers`.
 * 3. Enforces that the officer's status is active (is_active = true).
 * 4. Populates request.user with trusted database attributes (preventing role tampering).
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization Bearer token is missing or malformed.",
      },
    });
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is missing.",
      },
    });
  }

  // 1. Verify token validity with Supabase Auth
  let authUserEmail: string | undefined;
  let authUserId: string | undefined;

  try {
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data?.user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: error?.message || "Invalid or expired Supabase authentication token.",
        },
      });
    }

    authUserEmail = data.user.email?.trim().toLowerCase();
    authUserId = data.user.id;
  } catch (err: any) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "AUTH_VERIFICATION_FAILED",
        message: err.message || "Failed to verify authentication token.",
      },
    });
  }

  if (!authUserEmail) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token does not contain an associated user email.",
      },
    });
  }

  // 2. Query authorized_officers table to verify government officer whitelist
  const officer = await DBRepo.getAuthorizedOfficerByEmail(authUserEmail);

  // 3. Officer must exist in authorized_officers whitelist
  if (!officer) {
    return reply.status(403).send({
      success: false,
      error: {
        code: "OFFICER_NOT_AUTHORIZED",
        message: "Access denied. User is not registered as an authorized government officer.",
      },
    });
  }

  // 4. Officer must be active
  const isActive = officer.is_active !== undefined ? officer.is_active : officer.isActive;
  if (!isActive) {
    return reply.status(403).send({
      success: false,
      error: {
        code: "OFFICER_ACCOUNT_INACTIVE",
        message: "Access denied. Officer account is suspended or inactive.",
      },
    });
  }

  // 5. Populate request.user strictly with trusted database attributes
  const role: UserRole = (officer.role as UserRole) || "INSPECTOR";

  request.user = {
    id: officer.id || authUserId,
    email: officer.email,
    role,
    name: officer.name || authUserEmail,
    department: officer.department || "Legal Metrology Enforcement",
  };
}

/**
 * Role-Based Authorization Middleware
 * Enforces role checks in Fastify middleware (INSPECTOR, SUPERVISOR, ADMIN)
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "User must be authenticated before role check.",
        },
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required roles: [${allowedRoles.join(", ")}]. Current role: '${request.user.role}'.`,
        },
      });
    }
  };
}
