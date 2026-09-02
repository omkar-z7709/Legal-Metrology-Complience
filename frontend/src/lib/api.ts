export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
