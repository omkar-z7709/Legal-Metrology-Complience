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
import { eq, desc } from "drizzle-orm";
import { officialLegalMetrologyRules } from "./seed.js";
import crypto from "crypto";

// Cached connection flag: if postgres is unreachable, immediately use memory store without blocking
let isLiveDbReachable: boolean | null = null;

async function isDatabaseLive(): Promise<boolean> {
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

export class DBRepo {
  static async getScanComplianceChecks(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.scanId, scanId));

        if (list.length > 0) return list;
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
  }



  static async getProduct(id: string) {
    if (await isDatabaseLive()) {
      try {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, id));
        if (product) return product;
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
        if (created) return created;
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
        if (updated) return updated;
      } catch {}
    }

    const existing = memoryStore.scans.get(id);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.scans.set(id, updated);
      return updated;
    }
    return null;
  }

  static async getScan(id: string) {
    if (await isDatabaseLive()) {
      try {
        const [scan] = await db.select().from(scans).where(eq(scans.id, id));
        if (scan) return scan;
      } catch {}
    }
    return memoryStore.scans.get(id) || null;
  }

  static async getAllScans() {
    if (await isDatabaseLive()) {
      try {
        const all = await db
          .select()
          .from(scans)
          .orderBy(desc(scans.createdAt));
        if (all.length > 0) return all;
      } catch {}
    }
    return Array.from(memoryStore.scans.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
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
        if (data.ruleId) {
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
    return record;
  }

  static async insertViolation(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        if (data.ruleId) {
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
          } catch {}
        }
        await db.insert(violations).values({ id, ...data });
      } catch (err: any) {
        console.error("[DATABASE] Failed to insert violation:", err.message);
      }
    }
    memoryStore.violations.set(id, { id, ...data, createdAt: new Date() });
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
    return updatedRecord;
  }
}
