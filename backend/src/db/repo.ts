import { db, checkPostgresConnection } from "./index.js";
import {
  products,
  scans,
  images,
  extractedFields,
  complianceChecks,
  violations,
  reports,
  auditLogs,
  rules,
  users,
} from "./schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { officialLegalMetrologyRules } from "./seed.js";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// Cached connection flag: if postgres is unreachable, immediately use memory store without blocking
let isLiveDbReachable: boolean | null = null;

// Begin hydrating the durable fallback store immediately. Awaited on first DB
// access so restarts never serve stale reads (CJS/ESM-safe, no top-level await).
const hydrationReady = hydrateMemoryStore();

async function isDatabaseLive(): Promise<boolean> {
  await hydrationReady;
  if (isLiveDbReachable !== null) return isLiveDbReachable;
  const status = await checkPostgresConnection();
  isLiveDbReachable = status.connected;
  if (!status.connected) {
    console.warn(`[DATABASE] Postgres not reachable (${status.error || "connection failed"}). Operating in resilient fallback mode.`);
  } else {
    console.log(`[DATABASE] Postgres connected successfully (latency: ${status.latencyMs}ms).`);
  }
  return isLiveDbReachable;
}

// In-Memory Fallback State (Ensures 100% offline & sandbox execution without DB crash)
const memoryStore = {
  products: new Map<string, any>(),
  scans: new Map<string, any>(),
  images: new Map<string, any>(),
  extractedFields: new Map<string, any>(),
  complianceChecks: new Map<string, any>(),
  violations: new Map<string, any>(),
  reports: new Map<string, any>(),
  auditLogs: new Map<string, any>(),
  rules: new Map<string, any>(),
  users: new Map<string, any>(),
};

// Initialize In-Memory Seed Data
for (const r of officialLegalMetrologyRules) {
  memoryStore.rules.set(r.id, r);
}

export const SEEDED_TEST_USERS = [
  // 3 ADMIN Users
  {
    id: "usr-admin-01",
    email: "admin1@lm.gov.in",
    name: "Dr. Rajesh Kumar",
    role: "ADMIN",
    department: "Legal Metrology HQ",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-admin-02",
    email: "admin2@lm.gov.in",
    name: "Priya Sharma",
    role: "ADMIN",
    department: "Ministry of Consumer Affairs",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-admin-03",
    email: "admin3@lm.gov.in",
    name: "Vikram Singh",
    role: "ADMIN",
    department: "Directorate General HQ",
    mustChangePassword: false,
    isActive: true,
  },

  // 3 INSPECTOR Users
  {
    id: "usr-inspector-01",
    email: "inspector1@lm.gov.in",
    name: "Sarthak Verma",
    role: "INSPECTOR",
    department: "Zonal Enforcement Branch",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-inspector-02",
    email: "inspector2@lm.gov.in",
    name: "Ananya Patel",
    role: "INSPECTOR",
    department: "Western Zone Inspection Wing",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-inspector-03",
    email: "inspector3@lm.gov.in",
    name: "Rahul Deshmukh",
    role: "INSPECTOR",
    department: "Southern Regional Inspectorate",
    mustChangePassword: false,
    isActive: true,
  },

  // 3 SUPERVISOR Users
  {
    id: "usr-supervisor-01",
    email: "supervisor1@lm.gov.in",
    name: "Anita Rao",
    role: "SUPERVISOR",
    department: "Regional Directorate",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-supervisor-02",
    email: "supervisor2@lm.gov.in",
    name: "Suresh Mehta",
    role: "SUPERVISOR",
    department: "Central Enforcement Division",
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: "usr-supervisor-03",
    email: "supervisor3@lm.gov.in",
    name: "Meenakshi Sundaram",
    role: "SUPERVISOR",
    department: "State Quality Control Cell",
    mustChangePassword: false,
    isActive: true,
  },
];

for (const u of SEEDED_TEST_USERS) {
  memoryStore.users.set(u.id, { ...u, createdAt: new Date(), updatedAt: new Date() });
}

// ==== Durable Fallback Store (survives process restarts / dev hot-reloads) ====
// The in-memory store silently loses scans on every restart when Postgres is
// unreachable, which 404s the frontend on stale inspection links. Persist a
// JSON snapshot so fallback data survives restarts. `uploads/` is gitignored.
const MEMORY_STORE_FILE = path.resolve(
  process.cwd(),
  "uploads",
  ".memory-store.json",
);
const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "generatedAt",
  "timestamp",
  "reviewedAt",
  "expiresAt",
]);

let persistTimer: NodeJS.Timeout | null = null;

function dateReviver(key: string, value: any) {
  if (DATE_FIELDS.has(key) && typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

async function hydrateMemoryStore() {
  try {
    const raw = await fs.readFile(MEMORY_STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw, dateReviver);
    if (!parsed || typeof parsed !== "object") return;

    let restored = 0;
    for (const [key, entries] of Object.entries(parsed)) {
      const target = (memoryStore as any)[key];
      if (!(target instanceof Map) || !entries) continue;
      for (const [id, value] of Object.entries(entries as any)) {
        target.set(id, value);
        restored++;
      }
    }
    if (restored > 0) {
      console.log(
        `[DATABASE] Restored ${restored} record(s) from persistent fallback store.`,
      );
    }
  } catch {
    // No snapshot yet (first boot) or unreadable file - start fresh.
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void (async () => {
      try {
        const data: Record<string, Record<string, any>> = {};
        for (const [key, map] of Object.entries(memoryStore)) {
          data[key] = Object.fromEntries(map as Map<string, any>);
        }
        await fs.mkdir(path.dirname(MEMORY_STORE_FILE), { recursive: true });
        await fs.writeFile(
          MEMORY_STORE_FILE,
          JSON.stringify(data, null, 2),
          "utf-8",
        );
      } catch (err: any) {
        console.warn(
          `[DATABASE] Failed to persist fallback store: ${err.message}`,
        );
      }
    })();
  }, 300);
}

// ---- Read-through memoization cache (5s TTL, invalidated on writes) ----
const READ_CACHE_TTL = 5000;
const readCache = new Map<string, { value: unknown; expiresAt: number }>();

function readCacheGet<T>(key: string): T | undefined {
  const entry = readCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    readCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function readCacheSet(key: string, value: unknown) {
  readCache.set(key, { value, expiresAt: Date.now() + READ_CACHE_TTL });
  if (readCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of readCache) {
      if (now > v.expiresAt) readCache.delete(k);
    }
  }
}

function readCacheInvalidate(prefix: string) {
  for (const k of readCache.keys()) {
    if (k.startsWith(prefix)) readCache.delete(k);
  }
}

// Rule ids already known to exist in the `rules` table. Avoids a redundant
// `INSERT ... ON CONFLICT DO NOTHING` per inserted compliance check/violation.
const knownRuleIds = new Set<string>();

const scanCacheKey = (id: string) => `scan:${id}`;
const scansListKey = "scans:all";
const productCacheKey = (id: string) => `product:${id}`;
const productsListKey = "products:all";

export class DBRepo {
  static async getScanComplianceChecks(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const key = `cc-scan:${scanId}`;
        const cached = readCacheGet<any[]>(key);
        if (cached) return cached;
        const list = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.scanId, scanId));

        if (list.length > 0) {
          readCacheSet(key, list);
          return list;
        }
      } catch (err: any) {
        console.error("[DATABASE] Error fetching scan compliance checks:", err.message);
      }
    }

    return Array.from(memoryStore.complianceChecks.values()).filter(
      (c) => c.scanId === scanId,
    );
  }

  static async insertProduct(data: {
    name: string;
    brand?: string;
    category: string;
    commodityType?: string;
    manufacturerName?: string;
    manufacturerAddress?: string;
  }) {
    if (await isDatabaseLive()) {
      try {
        const [created] = await db.insert(products).values(data).returning();
        if (created) return created;
      } catch (error: any) {
        console.error("[DB] Failed to insert product in Postgres:", error.message);
      }
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.products.set(id, record);
    schedulePersist();
    readCacheInvalidate(productsListKey);
    return record;
  }

  static async updateProduct(id: string, data: Partial<any>) {
    if (await isDatabaseLive()) {
      try {
        await db.update(products).set(data).where(eq(products.id, id));
      } catch {}
    }
    const existing = memoryStore.products.get(id);
    if (existing) {
      memoryStore.products.set(id, {
        ...existing,
        ...data,
        updatedAt: new Date(),
      });
    }
    readCacheInvalidate(productCacheKey(id));
    schedulePersist();
  }



  static async getProduct(id: string) {
    const cached = readCacheGet<any>(productCacheKey(id));
    if (cached) return cached;
    if (await isDatabaseLive()) {
      try {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, id));
        if (product) {
          readCacheSet(productCacheKey(id), product);
          return product;
        }
      } catch {}
    }
    return memoryStore.products.get(id) || null;
  }

  static async insertScan(data: {
    productId?: string;
    inspectorId?: string;
    scanNumber: string;
    location?: string;
    status: string;
    complianceStatus?: string;
    complianceScore?: string;
  }) {
    if (await isDatabaseLive()) {
      try {
        const [created] = await db.insert(scans).values(data).returning();
        if (created) {
          readCacheInvalidate(scansListKey);
          return created;
        }
      } catch (error: any) {
        console.error("[DB] Failed to insert scan in Postgres:", error.message);
      }
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      ...data,
      reviewStatus: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.scans.set(id, record);
    readCacheInvalidate(scansListKey);
    schedulePersist();
    return record;
  }

  static async updateScan(id: string, data: Partial<any>) {
    if (await isDatabaseLive()) {
      try {
        const [updated] = await db
          .update(scans)
          .set(data)
          .where(eq(scans.id, id))
          .returning();
        if (updated) {
          readCacheInvalidate(scanCacheKey(id));
          readCacheInvalidate(scansListKey);
          return updated;
        }
      } catch {}
    }

    const existing = memoryStore.scans.get(id);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.scans.set(id, updated);
      readCacheInvalidate(scanCacheKey(id));
      readCacheInvalidate(scansListKey);
      schedulePersist();
      return updated;
    }
    return null;
  }

  static async getScan(id: string) {
    const cached = readCacheGet<any>(scanCacheKey(id));
    if (cached) return cached;
    if (await isDatabaseLive()) {
      try {
        const [scan] = await db.select().from(scans).where(eq(scans.id, id));
        if (scan) {
          readCacheSet(scanCacheKey(id), scan);
          return scan;
        }
      } catch {}
    }
    return memoryStore.scans.get(id) || null;
  }

  static async getAllScans() {
    const cached = readCacheGet<any[]>(scansListKey);
    if (cached) return cached;
    if (await isDatabaseLive()) {
      try {
        const all = await db
          .select({
            id: scans.id,
            productId: scans.productId,
            inspectorId: scans.inspectorId,
            scanNumber: scans.scanNumber,
            location: scans.location,
            status: scans.status,
            complianceStatus: scans.complianceStatus,
            complianceScore: scans.complianceScore,
            reviewStatus: scans.reviewStatus,
            reviewerNotes: scans.reviewerNotes,
            reviewedBy: scans.reviewedBy,
            reviewedAt: scans.reviewedAt,
            createdAt: scans.createdAt,
            updatedAt: scans.updatedAt,
          })
          .from(scans)
          .orderBy(desc(scans.createdAt));
        if (all.length > 0) {
          readCacheSet(scansListKey, all);
          return all;
        }
      } catch {}
    }
    return Array.from(memoryStore.scans.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  static async getScanStats(): Promise<{
    totalInspections: number;
    compliant: number;
    nonCompliant: number;
    requiresReview: number;
    averageComplianceScore: number;
  }> {
    if (await isDatabaseLive()) {
      try {
        const res: any[] = await db.execute(sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE compliance_status = 'COMPLIANT')::int AS compliant,
            COUNT(*) FILTER (WHERE compliance_status = 'NON_COMPLIANT')::int AS non_compliant,
            COUNT(*) FILTER (WHERE compliance_status = 'REQUIRES_REVIEW')::int AS requires_review,
            COALESCE(ROUND(AVG(compliance_score)), 0)::int AS avg_score
          FROM scans
        `);
        const r = res[0];
        if (r) {
          return {
            totalInspections: Number(r.total) || 0,
            compliant: Number(r.compliant) || 0,
            nonCompliant: Number(r.non_compliant) || 0,
            requiresReview: Number(r.requires_review) || 0,
            averageComplianceScore: Number(r.avg_score) || 0,
          };
        }
      } catch {}
    }
    // Memory fallback: aggregate directly from the store
    const all = Array.from(memoryStore.scans.values());
    const compliant = all.filter((s) => s.complianceStatus === "COMPLIANT").length;
    const nonCompliant = all.filter((s) => s.complianceStatus === "NON_COMPLIANT").length;
    const requiresReview = all.filter((s) => s.complianceStatus === "REQUIRES_REVIEW").length;
    const sum = all.reduce(
      (acc, s) => acc + (parseFloat(s.complianceScore || "0") || 0),
      0,
    );
    return {
      totalInspections: all.length,
      compliant,
      nonCompliant,
      requiresReview,
      averageComplianceScore: all.length > 0 ? Math.round(sum / all.length) : 0,
    };
  }

  static async getRecentScans(limit = 10) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select({
            id: scans.id,
            productId: scans.productId,
            scanNumber: scans.scanNumber,
            location: scans.location,
            status: scans.status,
            complianceStatus: scans.complianceStatus,
            complianceScore: scans.complianceScore,
            createdAt: scans.createdAt,
          })
          .from(scans)
          .orderBy(desc(scans.createdAt))
          .limit(limit);
        if (list.length > 0) return list;
      } catch {}
    }
    return Array.from(memoryStore.scans.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  static async getProductScans(productId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(scans)
          .where(eq(scans.productId, productId))
          .orderBy(desc(scans.createdAt));
        if (list.length > 0) return list;
      } catch {}
    }
    return Array.from(memoryStore.scans.values())
      .filter((s) => s.productId === productId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static async insertImage(data: any) {
    if (await isDatabaseLive()) {
      try {
        const [created] = await db.insert(images).values(data).returning();
        if (created) return created;
      } catch (error: any) {
        console.error("[DB] Failed to insert image in Postgres:", error.message);
      }
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      ...data,
      createdAt: new Date(),
    };
    memoryStore.images.set(id, record);
    schedulePersist();
    return record;
  }

  static async getScanImages(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(images)
          .where(eq(images.scanId, scanId));
        if (list.length > 0) return list;
      } catch {}
    }
    return Array.from(memoryStore.images.values()).filter(
      (img) => img.scanId === scanId,
    );
  }

  static async insertExtractedField(data: any) {
    const id = crypto.randomUUID();
    const { rawData, ...validFields } = data;
    if (await isDatabaseLive()) {
      try {
        await db.insert(extractedFields).values({ id, ...validFields });
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert extracted field:", err.message);
      }
    }
    memoryStore.extractedFields.set(id, { id, ...data, createdAt: new Date() });
    schedulePersist();
  }

  static async getScanExtractedFields(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select({
            id: extractedFields.id,
            scanId: extractedFields.scanId,
            fieldName: extractedFields.fieldName,
            fieldValue: extractedFields.fieldValue,
            rawText: extractedFields.rawText,
            confidence: extractedFields.confidence,
            boundingBox: extractedFields.boundingBox,
            isPresent: extractedFields.isPresent,
            validationStatus: extractedFields.validationStatus,
            createdAt: extractedFields.createdAt,
          })
          .from(extractedFields)
          .where(eq(extractedFields.scanId, scanId));
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching extracted fields:", err.message);
      }
    }
    return Array.from(memoryStore.extractedFields.values()).filter(
      (f) => f.scanId === scanId,
    );
  }

  static async insertComplianceCheck(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        if (data.ruleId && !knownRuleIds.has(data.ruleId)) {
          try {
            await db.insert(rules).values({
              id: data.ruleId,
              ruleNumber: data.ruleId,
              title: data.title || data.ruleId,
              description: data.reason || data.title || "Legal Metrology Statutory Rule",
              category: "GENERAL",
              requirement: data.reason || "Statutory Requirement",
              validationType: "PRESENCE",
            }).onConflictDoNothing();
            knownRuleIds.add(data.ruleId);
          } catch {}
        }
        const [created] = await db
          .insert(complianceChecks)
          .values({ id, ...data })
          .returning();
        if (created) return created;
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert compliance check:", err.message);
      }
    }
    const record = { id, ...data, createdAt: new Date() };
    memoryStore.complianceChecks.set(id, record);
    schedulePersist();
    return record;
  }

  static async insertViolation(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        if (data.ruleId && !knownRuleIds.has(data.ruleId)) {
          try {
            await db.insert(rules).values({
              id: data.ruleId,
              ruleNumber: data.ruleId,
              title: data.title || data.ruleId,
              description: data.description || "Statutory Violation Rule",
              category: "GENERAL",
              requirement: "Statutory Requirement",
              validationType: "PRESENCE",
            }).onConflictDoNothing();
            knownRuleIds.add(data.ruleId);
          } catch {}
        }
        await db.insert(violations).values({ id, ...data });
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert violation:", err.message);
      }
    }
    memoryStore.violations.set(id, { id, ...data, createdAt: new Date() });
    schedulePersist();
  }

  static async getScanViolations(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(violations)
          .where(eq(violations.scanId, scanId));
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching violations:", err.message);
      }
    }
    return Array.from(memoryStore.violations.values()).filter(
      (v) => v.scanId === scanId,
    );
  }

  static async getAllViolations() {
    if (await isDatabaseLive()) {
      try {
        const list = await db.select().from(violations);
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching all violations:", err.message);
      }
    }
    return Array.from(memoryStore.violations.values());
  }

  static async getAllProducts() {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(products)
          .orderBy(desc(products.createdAt));
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching all products:", err.message);
      }
    }
    return Array.from(memoryStore.products.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  static async insertReport(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        const [created] = await db
          .insert(reports)
          .values({ id, ...data })
          .returning();
        if (created) return created;
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert report:", err.message);
      }
    }
    const record = { id, ...data, generatedAt: new Date() };
    memoryStore.reports.set(id, record);
    schedulePersist();
    return record;
  }

  static async insertAuditLog(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        await db.insert(auditLogs).values({ id, ...data });
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert audit log:", err.message);
      }
    }
    memoryStore.auditLogs.set(id, { id, ...data, timestamp: new Date() });
    schedulePersist();
  }

  static async getAllAuditLogs() {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.timestamp));
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching audit logs:", err.message);
      }
    }
    return Array.from(memoryStore.auditLogs.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  static async getScanAuditHistory(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.resourceId, scanId))
          .orderBy(desc(auditLogs.timestamp));
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching scan audit history:", err.message);
      }
    }
    return Array.from(memoryStore.auditLogs.values())
      .filter((log) => log.resourceId === scanId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  static async getAllUsers() {
    if (await isDatabaseLive()) {
      try {
        const list = await db.select().from(users);
        if (list.length > 0) return list;
      } catch (err: any) {
        console.error("[DATABASE] Error fetching users:", err.message);
      }
    }
    return Array.from(memoryStore.users.values());
  }

  static async getUserByEmail(email: string) {
    if (await isDatabaseLive()) {
      try {
        const [found] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
        if (found) return found;
      } catch (err: any) {
        console.error("[DATABASE] Error finding user by email:", err.message);
      }
    }
    return Array.from(memoryStore.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  static async getUserById(id: string) {
    if (await isDatabaseLive()) {
      try {
        const [found] = await db.select().from(users).where(eq(users.id, id));
        if (found) return found;
      } catch (err: any) {
        console.error("[DATABASE] Error finding user by id:", err.message);
      }
    }
    return memoryStore.users.get(id);
  }

  static async insertUser(userData: any) {
    const id = userData.id || crypto.randomUUID();
    const record = {
      id,
      email: userData.email.toLowerCase(),
      name: userData.name,
      role: userData.role || "INSPECTOR",
      department: userData.department || "Legal Metrology Enforcement",
      mustChangePassword: userData.mustChangePassword ?? false,
      isActive: userData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (await isDatabaseLive()) {
      try {
        const [created] = await db.insert(users).values(record).returning();
        if (created) return created;
      } catch (err: any) {
        console.error("[DATABASE] Error inserting user:", err.message);
      }
    }
    memoryStore.users.set(id, record);
    schedulePersist();
    return record;
  }

  static async updateUser(id: string, updates: any) {
    if (await isDatabaseLive()) {
      try {
        const [updated] = await db
          .update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();
        if (updated) return updated;
      } catch (err: any) {
        console.error("[DATABASE] Error updating user:", err.message);
      }
    }
    const existing = memoryStore.users.get(id) || {};
    const updatedRecord = { ...existing, ...updates, updatedAt: new Date() };
    memoryStore.users.set(id, updatedRecord);
    schedulePersist();
    return updatedRecord;
  }
}
