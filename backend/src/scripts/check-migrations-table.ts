import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import postgres from "postgres";

async function checkMigrations() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
  const rows = await sql`SELECT * FROM drizzle.__drizzle_migrations;`;
  console.log("Recorded migrations in DB:", rows);
  await sql.end();
}

checkMigrations();
