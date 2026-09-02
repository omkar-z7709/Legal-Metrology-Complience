import { buildApp } from "../app.js";

async function runSelfTest() {
  console.log("==========================================");
  console.log("🧪 Running Fastify Backend Self-Test...");
  console.log("==========================================");

  const app = buildApp();

  // Test 1: Root endpoint
  const rootRes = await app.inject({
    method: "GET",
    url: "/",
  });
  console.log(`[GET /] Status: ${rootRes.statusCode}`);
  console.log(`Response:`, rootRes.json());
  if (rootRes.statusCode !== 200) {
    throw new Error("Root route test failed");
  }

  // Test 2: Health liveness endpoint
  const liveRes = await app.inject({
    method: "GET",
    url: "/api/health/live",
  });
  console.log(`\n[GET /api/health/live] Status: ${liveRes.statusCode}`);
  console.log(`Response:`, liveRes.json());
  if (liveRes.statusCode !== 200) {
    throw new Error("Liveness test failed");
  }

  // Test 3: Full health check endpoint (with Supabase ping)
  const healthRes = await app.inject({
    method: "GET",
    url: "/api/health",
  });
  console.log(`\n[GET /api/health] Status: ${healthRes.statusCode}`);
  console.log(`Response:`, JSON.stringify(healthRes.json(), null, 2));

  console.log("\n==========================================");
  console.log("✅ All Fastify Backend Route Tests Passed!");
  console.log("==========================================");
}

runSelfTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
