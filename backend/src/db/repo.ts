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

export class DBRepo {
  static async getScanComplianceChecks(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.scanId, scanId));

        if (list.length > 0) return list;
      } catch {}
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
      } catch {}
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
      } catch {}
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
        await db.insert(images).values(data);
      } catch {}
    }
    const id = crypto.randomUUID();
    memoryStore.images.set(id, { id, ...data, createdAt: new Date() });
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
    if (await isDatabaseLive()) {
      try {
        await db.insert(extractedFields).values(data);
      } catch {}
    }
    const id = crypto.randomUUID();
    memoryStore.extractedFields.set(id, { id, ...data, createdAt: new Date() });
  }

  static async getScanExtractedFields(scanId: string) {
    if (await isDatabaseLive()) {
      try {
        const list = await db
          .select()
          .from(extractedFields)
          .where(eq(extractedFields.scanId, scanId));
        if (list.length > 0) return list;
      } catch {}
    }
    return Array.from(memoryStore.extractedFields.values()).filter(
      (f) => f.scanId === scanId,
    );
  }

  static async insertComplianceCheck(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        const [created] = await db
          .insert(complianceChecks)
          .values({ id, ...data })
          .returning();
        if (created) return created;
      } catch {}
    }
    const record = { id, ...data, createdAt: new Date() };
    memoryStore.complianceChecks.set(id, record);
    return record;
  }

  static async insertViolation(data: any) {
    const id = crypto.randomUUID();
    if (await isDatabaseLive()) {
      try {
        await db.insert(violations).values({ id, ...data });
      } catch {}
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
      } catch {}
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
      } catch {}
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
      } catch {}
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
      } catch {}
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
      } catch {}
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
      } catch {}
    }
    return Array.from(memoryStore.auditLogs.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  static async getAllUsers() {
    if (await isDatabaseLive()) {
      try {
        const list = await db.select().from(users);
        if (list.length > 0) return list;
      } catch {}
    }
    return [
      {
        id: "usr-01",
        name: "Sarthak Verma",
        email: "sarthak.verma@lm.gov.in",
        role: "INSPECTOR",
        department: "Zonal Enforcement",
      },
      {
        id: "usr-02",
        name: "Anita Rao",
        email: "anita.rao@lm.gov.in",
        role: "SUPERVISOR",
        department: "Regional Directorate",
      },
      {
        id: "usr-03",
        name: "Dr. Rajesh Kumar",
        email: "rajesh.kumar@lm.gov.in",
        role: "ADMIN",
        department: "Legal Metrology HQ",
      },
    ];
  }
}
