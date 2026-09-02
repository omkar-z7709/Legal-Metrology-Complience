import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env.js";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL || "postgresql://postgres:postgrespassword@127.0.0.1:5432/postgres",
  },
  verbose: true,
  strict: true,
});
