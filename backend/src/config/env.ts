import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import fileURLToPath from "url";

// Ensure backend/.env is loaded even if run from monorepo root
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config(); // Fallback for running inside backend directory


const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional().default("postgresql://postgres:postgrespassword@127.0.0.1:5432/postgres"),
  SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  SUPABASE_ANON_KEY: z.string().min(1).default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_anon_key_for_dev_placeholder"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_service_key_for_dev_placeholder"),
  GEMINI_API_KEY: z.string().default(""),  // Required for embedding + RAG
  // NOTE: gemini-3.5-flash / gemini-3.6-flash / gemini-3.7-flash / gemini-3.8-flash
  // and gemini-flash-latest all return HTTP 503 "high demand" on this project.
  // gemini-3.5-flash-lite is the reliable fast vision+text model here.
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(90000),
  GEMINI_MAX_RETRIES: z.coerce.number().default(4),
  // Max pixels sent to Gemini per package image (inlineData payload cap).
  GEMINI_MAX_IMAGE_EDGE: z.coerce.number().default(1600),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
