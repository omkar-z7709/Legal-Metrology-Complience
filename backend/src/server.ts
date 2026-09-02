import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { RagLegalService } from "./services/rag/rag.service.js";

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
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
