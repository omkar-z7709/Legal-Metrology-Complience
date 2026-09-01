import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

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
  GEMINI_MODEL: z.string().default("gemini-3.7-flash"),
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
