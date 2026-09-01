export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserRole = "INSPECTOR" | "SUPERVISOR" | "ADMIN";

export interface OfficerUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface BackendHealthResponse {
  status: "healthy" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  system: {
    memoryMb: number;
    nodeVersion: string;
  };
  dependencies: {
    supabase: {
      status: "connected" | "error";
      latencyMs: number;
      error?: string;
    };
  };
}

const AUTH_TOKEN_KEY = "lm_auth_token";
const AUTH_USER_KEY = "lm_auth_user";

/**
 * Retrieves the stored Supabase JWT access token from client-side storage.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Retrieves the cached authenticated officer user profile.
 */
export function getAuthUser(): OfficerUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persists the authenticated officer session securely in client storage.
 */
export function setAuthSession(token: string, user: OfficerUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to persist auth session", err);
  }
}

/**
 * Clears the authenticated session upon logout or token invalidation.
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (err) {
    console.error("Failed to clear auth session", err);
  }
}

/**
 * Authenticates an officer against the backend endpoint.
 */
export async function loginOfficer(
  email: string,
  password: string,
): Promise<{ token: string; user: OfficerUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    const code = body?.error?.code || `HTTP_${res.status}`;
    const message =
      body?.error?.message ||
      (res.status === 401
        ? "Invalid official email or password."
        : res.status === 403
        ? "Access Denied: You are not authorized or your officer account is inactive."
        : "Login request failed. Please check your credentials.");

    const err = new Error(message);
    (err as any).code = code;
    (err as any).status = res.status;
    throw err;
  }

  const { token, user } = body.data;
  setAuthSession(token, user);
  return { token, user };
}

/**
 * Centralized Authenticated Fetch Wrapper
 * Automatically attaches Authorization Bearer token to requests.
 * Handles 401s by clearing session and notifying the client.
 */
export async function authFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has("authorization") && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url =
    typeof input === "string" && input.startsWith("/")
      ? `${API_BASE_URL}${input}`
      : input.toString();

  const response = await fetch(url, {
    ...init,
    headers,
  });

  // If token is invalid or expired, clear session
  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}

/**
 * Type-safe JSON fetcher with automated authentication.
 */
export async function authFetchJson<T>(
  input: string | URL,
  init: RequestInit = {},
): Promise<T> {
  const res = await authFetch(input, init);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      `Request failed with status ${res.status}`;
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).data = errorBody;
    throw err;
  }
  return res.json();
}

/**
 * Checks overall backend and Supabase infrastructure connectivity.
 */
export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/health`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    if (errorBody && errorBody.status) {
      return errorBody as BackendHealthResponse;
    }
    throw new Error(`Backend returned HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
