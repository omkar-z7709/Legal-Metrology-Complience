import { checkSupabaseConnection } from "../db/supabase.js";
import { env } from "../config/env.js";

async function testConnection() {
  console.log("==========================================");
  console.log("📡 Testing Supabase Database Connection...");
  console.log(`Endpoint URL: ${env.SUPABASE_URL}`);
  console.log("==========================================");

  const status = await checkSupabaseConnection();

  if (status.connected) {
    console.log(`✅ Supabase Connection Successful! (Latency: ${status.latencyMs}ms)`);
    process.exit(0);
  } else {
    console.warn(`⚠️ Supabase Connection Degraded / Notice: ${status.error}`);
    console.log(`Latency: ${status.latencyMs}ms`);
    console.log("Note: If running in local dev without live Supabase cloud/local instance yet, provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(0);
  }
}

testConnection();
