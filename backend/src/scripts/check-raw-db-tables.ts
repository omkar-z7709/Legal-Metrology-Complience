import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import postgres from "postgres";

async function checkTables() {
  const url = process.env.DATABASE_URL;
  console.log("Connecting directly to:", url?.replace(/:[^:@]+@/, ":****@"));
  
  if (!url) {
    console.error("No DATABASE_URL found!");
    process.exit(1);
  }

  const sql = postgres(url, { ssl: "require" });
  
  try {
    const rows = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `;
    
    console.log("\n=========================================");
    console.log(`FOUND ${rows.length} TABLES IN DATABASE:`);
    console.log("=========================================");
    rows.forEach((r) => {
      console.log(`  - Schema: [${r.table_schema}] Table: [${r.table_name}]`);
    });
    console.log("=========================================\n");

    const rulesCount = await sql`SELECT count(*) FROM rules;`;
    console.log(`Rules table row count: ${rulesCount[0].count}`);

    const usersCount = await sql`SELECT count(*) FROM users;`;
    console.log(`Users table row count: ${usersCount[0].count}`);

    await sql.end();
  } catch (err) {
    console.error("Error inspecting database:", err);
    await sql.end();
    process.exit(1);
  }
}

checkTables();
