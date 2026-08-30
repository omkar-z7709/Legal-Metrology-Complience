import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Client for anonymous or forwarded user JWT operations
export const supabaseClient: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin client for backend operations requiring service role privileges
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface DatabaseStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Validates connectivity to the Supabase endpoint.
 */
export async function checkSupabaseConnection(): Promise<DatabaseStatus> {
  const start = Date.now();
  try {
    // Ping Supabase storage or auth endpoint to verify connection & credentials
    const { error } = await supabaseAdmin.storage.listBuckets();
    const latencyMs = Date.now() - start;

    if (error) {
      return {
        connected: false,
        latencyMs,
        error: error.message,
      };
    }

    return {
      connected: true,
      latencyMs,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err.message || "Unknown error connecting to Supabase",
    };
  }
}
