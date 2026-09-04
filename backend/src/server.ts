import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { RagLegalService } from "./services/rag/rag.service.js";
import { sql } from "./db/index.js";

async function main() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 Server listening at ${address}`);
    app.log.info(`🔍 Health check: ${address}/api/health`);

    // Warm up and initialize RAG knowledge base in background
    RagLegalService.ensureInitialized().catch((e) =>
      app.log.warn(`[RAG] Background init warning: ${e.message}`)
    );

    // Keep the Neon database connection warm so requests never pay the
    // connection cold-start. Pings every 30s and on a 15s drain guard.
    const warmDb = () =>
      sql`SELECT 1`.then(
        () => {},
        (e) => app.log.warn(`[DB] Warm-up ping notice: ${e.message}`),
      );
    warmDb();
    const keepAlive = setInterval(warmDb, 30_000);
    keepAlive.unref();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
