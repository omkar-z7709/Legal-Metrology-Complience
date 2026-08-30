import { buildApp } from "../app.js";

async function runAuthTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 2: Supabase Auth & Role-Based Permissions");
  console.log("==================================================");

  const app = buildApp();

  // Test 1: Unauthenticated request should fail with 401
  console.log("1️⃣ Testing Unauthenticated Request...");
  const resUnauth = await app.inject({
    method: "GET",
    url: "/api/auth/me",
  });
  console.log(`   [GET /api/auth/me (no token)] Status: ${resUnauth.statusCode}`);
  if (resUnauth.statusCode !== 401) {
    throw new Error(`Expected 401, got ${resUnauth.statusCode}`);
  }
  console.log("   ✓ Unauthenticated request blocked correctly (401 Unauthorized)");

  // Test 2: Inspector Login
  console.log("\n2️⃣ Testing Inspector Login...");
  const resLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "INSPECTOR" },
  });
  console.log(`   [POST /api/auth/login] Status: ${resLogin.statusCode}`);
  const loginData = resLogin.json();
  const token = loginData.data.token;
  console.log(`   ✓ Received Token for: ${loginData.data.user.name} (${loginData.data.user.role})`);

  // Test 3: Inspector accessing Inspector Route
  console.log("\n3️⃣ Testing Inspector accessing Inspector Route...");
  const resInspectorScans = await app.inject({
    method: "GET",
    url: "/api/inspector/scans",
    headers: { authorization: `Bearer ${token}` },
  });
  console.log(`   [GET /api/inspector/scans] Status: ${resInspectorScans.statusCode}`);
  if (resInspectorScans.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resInspectorScans.statusCode}`);
  }
  console.log("   ✓ Inspector allowed on Inspector route (200 OK)");

  // Test 4: Inspector attempting to access Admin Route (Must be blocked with 403)
  console.log("\n4️⃣ Testing Inspector attempting to access Admin Route (Privilege Escalation Prevention)...");
  const resForbidden = await app.inject({
    method: "GET",
    url: "/api/admin/users",
    headers: { authorization: `Bearer ${token}` },
  });
  console.log(`   [GET /api/admin/users (as INSPECTOR)] Status: ${resForbidden.statusCode}`);
  if (resForbidden.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${resForbidden.statusCode}`);
  }
  console.log("   ✓ Inspector correctly forbidden from Admin route (403 Forbidden)");

  // Test 5: Admin Login and Admin Route Access
  console.log("\n5️⃣ Testing Admin Login and Access...");
  const resAdminLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "ADMIN" },
  });
  const adminToken = resAdminLogin.json().data.token;
  const resAdminAccess = await app.inject({
    method: "GET",
    url: "/api/admin/users",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  console.log(`   [GET /api/admin/users (as ADMIN)] Status: ${resAdminAccess.statusCode}`);
  if (resAdminAccess.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resAdminAccess.statusCode}`);
  }
  console.log("   ✓ Admin allowed on Admin route (200 OK)");

  // Test 6: Supervisor Login and Review Route Access
  console.log("\n6️⃣ Testing Supervisor Access...");
  const resSupLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "SUPERVISOR" },
  });
  const supToken = resSupLogin.json().data.token;
  const resSupAccess = await app.inject({
    method: "GET",
    url: "/api/supervisor/reviews",
    headers: { authorization: `Bearer ${supToken}` },
  });
  console.log(`   [GET /api/supervisor/reviews (as SUPERVISOR)] Status: ${resSupAccess.statusCode}`);
  if (resSupAccess.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resSupAccess.statusCode}`);
  }
  console.log("   ✓ Supervisor allowed on Review route (200 OK)");

  console.log("\n==================================================");
  console.log("✅ MODULE 2: All Authentication & Role Tests Passed!");
  console.log("==================================================");
}

runAuthTests().catch((err) => {
  console.error("❌ Auth test failure:", err);
  process.exit(1);
});
