import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 Server listening at ${address}`);
    app.log.info(`🔍 Health check: ${address}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
