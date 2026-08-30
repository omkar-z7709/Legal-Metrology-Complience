import { FastifyRequest, FastifyReply } from "fastify";
import { supabaseClient } from "../db/supabase.js";

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

// Development and demo fallback credentials
const DEV_USERS: Record<string, AuthUser> = {
  "inspector.sarthak@lm.gov.in": {
    id: "u1111111-1111-1111-1111-111111111111",
    email: "inspector.sarthak@lm.gov.in",
    role: "INSPECTOR",
    name: "Sarthak Verma",
    department: "Legal Metrology Enforcement Directorate",
  },
  "supervisor.anita@lm.gov.in": {
    id: "u2222222-2222-2222-2222-222222222222",
    email: "supervisor.anita@lm.gov.in",
    role: "SUPERVISOR",
    name: "Anita Rao",
    department: "Legal Metrology Zonal Office",
  },
  "admin.director@lm.gov.in": {
    id: "u3333333-3333-3333-3333-333333333333",
    email: "admin.director@lm.gov.in",
    role: "ADMIN",
    name: "Director General",
    department: "Ministry of Consumer Affairs",
  },
};

/**
 * Authentication Middleware: Extracts & validates JWT or test bearer token
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

  const token = authHeader.split(" ")[1];

  // 1. Check for dev/demo prototype tokens: dev-inspector, dev-supervisor, dev-admin
  if (token.startsWith("dev-")) {
    const roleKey = token.replace("dev-", "").toLowerCase();
    const matchedUser = Object.values(DEV_USERS).find(
      (u) => u.role.toLowerCase() === roleKey
    );

    if (matchedUser) {
      request.user = matchedUser;
      return;
    }
  }

  // 2. Verify with Supabase Auth
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: error?.message || "Invalid or expired Supabase authentication token.",
        },
      });
    }

    // Role is stored in user_metadata or default to INSPECTOR
    const role: UserRole = (user.user_metadata?.role as UserRole) || "INSPECTOR";

    request.user = {
      id: user.id,
      email: user.email || "",
      role,
      name: user.user_metadata?.name || user.email || "Official",
      department: user.user_metadata?.department || "Legal Metrology Department",
    };
  } catch (err: any) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "AUTH_VERIFICATION_FAILED",
        message: err.message || "Failed to verify authentication token.",
      },
    });
  }
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
