import { buildApp } from "../app.js";
import { supabaseClient } from "../db/supabase.js";
import { DBRepo } from "../db/repo.js";

async function runAuthTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 2: Authorized Officer Authentication & RBAC Tests");
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

  // Test 2: Malformed login request payload (Missing password)
  console.log("\n2️⃣ Testing Validation Error (Missing fields)...");
  const resValidation = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "test.inspector@lm.gov.in" },
  });
  console.log(`   [POST /api/auth/login (missing password)] Status: ${resValidation.statusCode}`);
  if (resValidation.statusCode !== 400) {
    throw new Error(`Expected 400, got ${resValidation.statusCode}`);
  }
  console.log("   ✓ Validation error handled correctly (400 Bad Request)");

  // Test 3: Invalid Supabase Credentials (401)
  console.log("\n3️⃣ Testing Invalid Credentials (Wrong Password)...");
  // Mock Supabase signInWithPassword for this test
  const originalSignIn = supabaseClient.auth.signInWithPassword;
  supabaseClient.auth.signInWithPassword = (async (credentials: any) => {
    if (credentials.password === "wrongpassword") {
      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } } as any;
    }
    return originalSignIn.call(supabaseClient.auth, credentials);
  }) as any;

  const resInvalid = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "test.inspector@lm.gov.in", password: "wrongpassword" },
  });
  console.log(`   [POST /api/auth/login (wrong password)] Status: ${resInvalid.statusCode}`);
  if (resInvalid.statusCode !== 401) {
    throw new Error(`Expected 401, got ${resInvalid.statusCode}`);
  }
  console.log("   ✓ Invalid credentials rejected (401 Unauthorized)");

  // Test 4: Authenticated user not in authorized_officers table (403)
  console.log("\n4️⃣ Testing Unauthorized User (Valid Supabase Auth, but NOT in authorized_officers)...");
  const originalGetUser = supabaseClient.auth.getUser;

  supabaseClient.auth.signInWithPassword = async () => {
    return {
      data: {
        session: { access_token: "jwt-unauthorized-user" },
        user: { id: "u-unauth-999", email: "civilian.citizen@gmail.com" },
      },
      error: null,
    } as any;
  };

  supabaseClient.auth.getUser = async (token: string) => {
    if (token === "jwt-unauthorized-user") {
      return {
        data: { user: { id: "u-unauth-999", email: "civilian.citizen@gmail.com" } },
        error: null,
      } as any;
    }
    return originalGetUser.call(supabaseClient.auth, token);
  };

  const resUnauthorizedLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "civilian.citizen@gmail.com", password: "somepassword123" },
  });
  console.log(`   [POST /api/auth/login (not in whitelist)] Status: ${resUnauthorizedLogin.statusCode}`);
  if (resUnauthorizedLogin.statusCode !== 403) {
    throw new Error(`Expected 403, got ${resUnauthorizedLogin.statusCode}`);
  }
  console.log("   ✓ Unauthorized user denied (403 Forbidden)");

  // Test 5: Inactive / Suspended Officer (403)
  console.log("\n5️⃣ Testing Inactive / Suspended Officer Login (is_active = false)...");
  supabaseClient.auth.signInWithPassword = async () => {
    return {
      data: {
        session: { access_token: "jwt-inactive-officer" },
        user: { id: "a4444444-4444-4444-4444-444444444444", email: "inactive.officer@lm.gov.in" },
      },
      error: null,
    } as any;
  };

  supabaseClient.auth.getUser = async (token: string) => {
    if (token === "jwt-inactive-officer") {
      return {
        data: { user: { id: "a4444444-4444-4444-4444-444444444444", email: "inactive.officer@lm.gov.in" } },
        error: null,
      } as any;
    }
    return originalGetUser.call(supabaseClient.auth, token);
  };

  const resInactiveLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "inactive.officer@lm.gov.in", password: "validpassword123" },
  });
  console.log(`   [POST /api/auth/login (inactive officer)] Status: ${resInactiveLogin.statusCode}`);
  if (resInactiveLogin.statusCode !== 403) {
    throw new Error(`Expected 403, got ${resInactiveLogin.statusCode}`);
  }
  console.log("   ✓ Inactive officer denied access (403 Forbidden)");

  // Test 6: Valid Inspector Login & Access Checks
  console.log("\n6️⃣ Testing Valid Inspector Login & Access Controls...");
  supabaseClient.auth.signInWithPassword = async () => {
    return {
      data: {
        session: { access_token: "jwt-inspector-valid" },
        user: { id: "a1111111-1111-1111-1111-111111111111", email: "test.inspector@lm.gov.in" },
      },
      error: null,
    } as any;
  };

  supabaseClient.auth.getUser = async (token: string) => {
    if (token === "jwt-inspector-valid") {
      return {
        data: { user: { id: "a1111111-1111-1111-1111-111111111111", email: "test.inspector@lm.gov.in" } },
        error: null,
      } as any;
    }
    if (token === "jwt-supervisor-valid") {
      return {
        data: { user: { id: "a2222222-2222-2222-2222-222222222222", email: "test.supervisor@lm.gov.in" } },
        error: null,
      } as any;
    }
    if (token === "jwt-admin-valid") {
      return {
        data: { user: { id: "a3333333-3333-3333-3333-333333333333", email: "test.admin@lm.gov.in" } },
        error: null,
      } as any;
    }
    return originalGetUser.call(supabaseClient.auth, token);
  };

  const resInspectorLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "test.inspector@lm.gov.in", password: "validpassword123" },
  });
  console.log(`   [POST /api/auth/login (inspector)] Status: ${resInspectorLogin.statusCode}`);
  const inspectorToken = resInspectorLogin.json().data.token;
  const inspectorData = resInspectorLogin.json().data.user;
  console.log(`   ✓ Authenticated: ${inspectorData.name} (Role: ${inspectorData.role})`);

  // Inspector accessing Inspector Scans
  const resInspectorAllowed = await app.inject({
    method: "GET",
    url: "/api/inspector/scans",
    headers: { authorization: `Bearer ${inspectorToken}` },
  });
  console.log(`   [GET /api/inspector/scans (as INSPECTOR)] Status: ${resInspectorAllowed.statusCode}`);
  if (resInspectorAllowed.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resInspectorAllowed.statusCode}`);
  }
  console.log("   ✓ Inspector permitted on Inspector route (200 OK)");

  // Inspector attempting to access Admin endpoint (Must be 403)
  const resInspectorBlockedAdmin = await app.inject({
    method: "GET",
    url: "/api/admin/users",
    headers: { authorization: `Bearer ${inspectorToken}` },
  });
  console.log(`   [GET /api/admin/users (as INSPECTOR)] Status: ${resInspectorBlockedAdmin.statusCode}`);
  if (resInspectorBlockedAdmin.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${resInspectorBlockedAdmin.statusCode}`);
  }
  console.log("   ✓ Inspector forbidden from Admin route (403 Forbidden)");

  // Test 7: Valid Supervisor Login & Access
  console.log("\n7️⃣ Testing Valid Supervisor Access...");
  supabaseClient.auth.signInWithPassword = async () => {
    return {
      data: {
        session: { access_token: "jwt-supervisor-valid" },
        user: { id: "a2222222-2222-2222-2222-222222222222", email: "test.supervisor@lm.gov.in" },
      },
      error: null,
    } as any;
  };

  const resSupLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "test.supervisor@lm.gov.in", password: "validpassword123" },
  });
  const supToken = resSupLogin.json().data.token;

  const resSupReviews = await app.inject({
    method: "GET",
    url: "/api/supervisor/reviews",
    headers: { authorization: `Bearer ${supToken}` },
  });
  console.log(`   [GET /api/supervisor/reviews (as SUPERVISOR)] Status: ${resSupReviews.statusCode}`);
  if (resSupReviews.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resSupReviews.statusCode}`);
  }
  console.log("   ✓ Supervisor permitted on Reviews route (200 OK)");

  // Test 8: Valid Admin Login & Access
  console.log("\n8️⃣ Testing Valid Admin Access...");
  supabaseClient.auth.signInWithPassword = async () => {
    return {
      data: {
        session: { access_token: "jwt-admin-valid" },
        user: { id: "a3333333-3333-3333-3333-333333333333", email: "test.admin@lm.gov.in" },
      },
      error: null,
    } as any;
  };

  const resAdminLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "test.admin@lm.gov.in", password: "validpassword123" },
  });
  const adminToken = resAdminLogin.json().data.token;

  const resAdminUsers = await app.inject({
    method: "GET",
    url: "/api/admin/users",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  console.log(`   [GET /api/admin/users (as ADMIN)] Status: ${resAdminUsers.statusCode}`);
  if (resAdminUsers.statusCode !== 200) {
    throw new Error(`Expected 200, got ${resAdminUsers.statusCode}`);
  }
  console.log("   ✓ Admin permitted on Admin route (200 OK)");

  // Restore mocks
  supabaseClient.auth.signInWithPassword = originalSignIn;
  supabaseClient.auth.getUser = originalGetUser;

  console.log("\n==================================================");
  console.log("✅ ALL AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runAuthTests().catch((err) => {
  console.error("❌ Auth test failure:", err);
  process.exit(1);
});
