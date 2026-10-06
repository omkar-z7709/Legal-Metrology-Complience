import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

async function applyDirectSchema() {
  const url = process.env.DATABASE_URL;
  console.log("Connecting to:", url?.replace(/:[^:@]+@/, ":****@"));
  
  if (!url) {
    console.error("No DATABASE_URL found!");
    process.exit(1);
  }

  const sql = postgres(url, { ssl: "require" });
  
  try {
    console.log("1. Creating extensions...");
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    console.log("2. Reading 0000_typical_korg.sql...");
    const sqlPath = path.resolve(process.cwd(), "backend/src/db/migrations/0000_typical_korg.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("3. Executing schema DDL statements...");
    // Split by --> statement-breakpoint
    const statements = sqlContent.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await sql.unsafe(stmt);
      } catch (err: any) {
        // Ignore duplicate type / table errors if they already exist
        if (err.code === "42710" || err.code === "42P07") {
          console.log(`  [Skipped existing object]: ${err.message}`);
        } else {
          console.error(`  [Error on stmt ${i + 1}]:`, err.message);
        }
      }
    }

    console.log("✅ Schema applied directly!");
    await sql.end();
  } catch (err) {
    console.error("Failed to apply direct schema:", err);
    await sql.end();
    process.exit(1);
  }
}

applyDirectSchema();
