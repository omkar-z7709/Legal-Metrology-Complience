import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "../db/index.js";

async function main() {
  console.log("🚀 Ensuring pgvector extension and running migrations...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
  console.log("✅ Extensions verified.");

  const migrationsFolder = path.resolve(process.cwd(), "backend/src/db/migrations");
  console.log(`Applying migrations from: ${migrationsFolder}`);
  
  await migrate(db, { migrationsFolder });
  console.log("✅ All Drizzle migrations applied successfully to Neon PostgreSQL!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
