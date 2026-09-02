import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate, requireRole } from "../middleware/auth.js";
import { InspectionPipelineService } from "../services/inspection/pipeline.service.js";
import { ReportService } from "../services/reports/report.service.js";
import { DocxReportService } from "../services/reports/docx-report.service.js";
import { DBRepo } from "../db/repo.js";
import { z } from "zod";

const reviewPayloadSchema = z.object({
  decision: z.enum(["ACCEPT", "ACCEPTED", "REJECT", "REJECTED", "MANUAL_REVIEW", "OVERRIDDEN"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
  overriddenStatus: z.enum(["COMPLIANT", "NON_COMPLIANT", "REQUIRES_REVIEW"]).optional(),
}).refine(
  (data) => {
    const isReject = data.decision === "REJECT" || data.decision === "REJECTED";
    const isManual = data.decision === "MANUAL_REVIEW";
    if (isReject || isManual) {
      const comment = (data.reason || data.notes || "").trim();
      return comment.length > 0;
    }
    return true;
  },
  {
    message: "A reason or comment is required for REJECT and MANUAL_REVIEW decisions.",
    path: ["reason"],
  }
);

export const inspectionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Run Complete AI + Rules Compliance Analysis Pipeline (Modules 5-12)
  fastify.post("/inspections/:id/analyze", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await InspectionPipelineService.processScan(id);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "ANALYSIS_FAILED", message: err.message },
      });
    }
  });

  // 2. Human Review / Audit Decision (Module 13 & Part 4)
  const handleReviewOrAudit = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const scan = await DBRepo.getScan(id);
    if (!scan) {
      return reply.status(404).send({
        success: false,
        error: { code: "SCAN_NOT_FOUND", message: `Scan ${id} not found.` },
      });
    }

    const parseResult = reviewPayloadSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.errors[0]?.message || "Invalid review decision payload",
        },
      });
    }

    const { decision, reason, notes, overriddenStatus } = parseResult.data;
    const finalComment = (reason || notes || "Decision recorded by authorized inspector.").trim();

    // Map decision enum
    let normalizedDecision: "ACCEPTED" | "REJECTED" | "MANUAL_REVIEW" | "OVERRIDDEN" = "ACCEPTED";
    if (decision === "ACCEPT" || decision === "ACCEPTED") normalizedDecision = "ACCEPTED";
    else if (decision === "REJECT" || decision === "REJECTED") normalizedDecision = "REJECTED";
    else if (decision === "MANUAL_REVIEW") normalizedDecision = "MANUAL_REVIEW";
    else if (decision === "OVERRIDDEN") normalizedDecision = "OVERRIDDEN";

    // Update scan review status via DBRepo (DO NOT overwrite automated complianceStatus/Score unless OVERRIDDEN)
    const updatedScan = await DBRepo.updateScan(id, {
      reviewStatus: normalizedDecision,
      reviewerNotes: finalComment,
      reviewedBy: request.user?.id && request.user.id.includes("-") ? request.user.id : undefined,
      reviewedAt: new Date(),
      ...(overriddenStatus ? { complianceStatus: overriddenStatus } : {}),
    });

    // Record in Audit Log (Audit Trail)
    await DBRepo.insertAuditLog({
      userId: request.user?.id && request.user.id.includes("-") ? request.user.id : undefined,
      userEmail: request.user?.email || "officer@lm.gov.in",
      action: `AUDIT_${normalizedDecision}`,
      resourceType: "SCAN",
      resourceId: id,
      details: {
        decision: normalizedDecision,
        reason: finalComment,
        notes: finalComment,
        previousReviewStatus: scan.reviewStatus || "PENDING",
        automatedComplianceStatus: scan.complianceStatus,
      },
    });

    console.log(`[AUDIT] ${normalizedDecision} decision saved for scan ${id} by ${request.user?.email || "Inspector"}`);

    return reply.status(200).send({
      success: true,
      data: {
        scan: updatedScan,
        message: `Inspection audit decision recorded as '${normalizedDecision}'.`,
      },
    });
  };

  fastify.post(
    "/inspections/:id/review",
    { preHandler: [authenticate, requireRole(["INSPECTOR", "SUPERVISOR", "ADMIN"])] },
    handleReviewOrAudit
  );

  fastify.post(
    "/inspections/:id/audit",
    { preHandler: [authenticate, requireRole(["INSPECTOR", "SUPERVISOR", "ADMIN"])] },
    handleReviewOrAudit
  );

  // Get Scan Specific Audit History
  fastify.get(
    "/inspections/:id/audit",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const auditHistory = await DBRepo.getScanAuditHistory(id);

      return reply.status(200).send({
        success: true,
        data: {
          scanId: id,
          auditHistory,
          count: auditHistory.length,
        },
      });
    }
  );

  // 3. Generate Official Inspection Report PDF (POST & GET variants)
  fastify.post("/inspections/:id/report", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const report = await ReportService.generateInspectionReport(id, request.user?.id);
      return reply.status(201).send({
        success: true,
        data: report,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "REPORT_GENERATION_FAILED", message: err.message },
      });
    }
  });

  fastify.get("/inspections/:id/report", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { download } = request.query as { download?: string };

    try {
      const report = await ReportService.generateInspectionReport(id, request.user?.id);

      if (download === "true" || download === "1") {
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `attachment; filename="${report.reportNumber}.pdf"`);
        return reply.send(report.pdfBuffer);
      }

      return reply.status(200).send({
        success: true,
        data: report,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "REPORT_GENERATION_FAILED", message: err.message },
      });
    }
  });

  // 4. Generate Editable DOCX Inspection Report (Task 8)
  fastify.get("/inspections/:id/report/docx", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const docxReport = await DocxReportService.generateDocxReport(id, request.user?.id);

      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      reply.header("Content-Disposition", `attachment; filename="${docxReport.reportNumber}.docx"`);
      return reply.send(docxReport.docxBuffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "DOCX_REPORT_GENERATION_FAILED", message: err.message },
      });
    }
  });

  fastify.post("/inspections/:id/report/docx", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const docxReport = await DocxReportService.generateDocxReport(id, request.user?.id);
      return reply.status(201).send({
        success: true,
        data: docxReport,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "DOCX_REPORT_GENERATION_FAILED", message: err.message },
      });
    }
  });

  // 4. Live Enforcement Dashboard Statistics (Module 15 & Task 7)
  fastify.get("/dashboard/stats", { preHandler: [authenticate] }, async (request, reply) => {
    const allScans = await DBRepo.getAllScans();
    const totalInspections = allScans.length;
    const compliant = allScans.filter((s) => s.complianceStatus === "COMPLIANT").length;
    const nonCompliant = allScans.filter((s) => s.complianceStatus === "NON_COMPLIANT").length;
    const requiresReview = allScans.filter((s) => s.complianceStatus === "REQUIRES_REVIEW").length;

    const totalScoresSum = allScans.reduce((sum, s) => sum + (parseFloat(s.complianceScore || "0") || 0), 0);
    const averageComplianceScore = totalInspections > 0 ? Math.round(totalScoresSum / totalInspections) : 0;
    const complianceRatePercentage = totalInspections > 0 ? Math.round((compliant / totalInspections) * 100) : 0;

    const allViolations = await DBRepo.getAllViolations();

    // Group violations into the 10 statutory categories
    const categoriesCount: Record<string, number> = {
      MISSING_DECLARATION: 0,
      INVALID_MRP: 0,
      INVALID_NET_QUANTITY: 0,
      MISSING_MANUFACTURER: 0,
      MISSING_CONSUMER_CARE: 0,
      COUNTRY_OF_ORIGIN: 0,
      FONT_SIZE: 0,
      READABILITY: 0,
      PLACEMENT: 0,
      NON_STANDARD_DECLARATION: 0,
    };

    allViolations.forEach((v) => {
      const type = (v.violationType || v.title || "").toUpperCase();
      if (type.includes("MRP")) categoriesCount.INVALID_MRP++;
      else if (type.includes("QUANTITY") || type.includes("NET")) categoriesCount.INVALID_NET_QUANTITY++;
      else if (type.includes("MANUFACTURER") || type.includes("PACKER")) categoriesCount.MISSING_MANUFACTURER++;
      else if (type.includes("CARE") || type.includes("GRIEVANCE")) categoriesCount.MISSING_CONSUMER_CARE++;
      else if (type.includes("ORIGIN") || type.includes("MADE IN")) categoriesCount.COUNTRY_OF_ORIGIN++;
      else if (type.includes("FONT")) categoriesCount.FONT_SIZE++;
      else if (type.includes("READAB")) categoriesCount.READABILITY++;
      else if (type.includes("PLACE")) categoriesCount.PLACEMENT++;
      else if (type.includes("MISSING") || type.includes("ABSENT")) categoriesCount.MISSING_DECLARATION++;
      else categoriesCount.NON_STANDARD_DECLARATION++;
    });

    const recentInspections = allScans.slice(0, 10);

    // Products with repeated violations
    const productViolationMap = new Map<string, number>();
    allViolations.forEach((v) => {
      if (v.scanId) {
        productViolationMap.set(v.scanId, (productViolationMap.get(v.scanId) || 0) + 1);
      }
    });

    return reply.status(200).send({
      success: true,
      data: {
        metrics: {
          totalInspections,
          compliant,
          nonCompliant,
          requiresReview,
          averageComplianceScore,
          complianceRatePercentage,
        },
        violationsBreakdown: {
          totalViolations: allViolations.length,
          categories: categoriesCount,
        },
        recentInspections,
      },
    });
  });

  // 5. Longitudinal Product Inspection History (Module 16)
  fastify.get("/products/:id/history", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await DBRepo.getProduct(id);
    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: "PRODUCT_NOT_FOUND", message: `Product ${id} not found.` },
      });
    }

    const productScans = await DBRepo.getProductScans(id);

    return reply.status(200).send({
      success: true,
      data: {
        product,
        totalInspections: productScans.length,
        history: productScans,
      },
    });
  });

  // 6. List All Inspected Commodities / Products
  fastify.get("/products", { preHandler: [authenticate] }, async (request, reply) => {
    const productList = await DBRepo.getAllProducts();
    return reply.status(200).send({
      success: true,
      data: {
        products: productList,
        count: productList.length,
      },
    });
  });

  // 7. List Statutory Audit Trail Logs (Module 13 & 18)
  fastify.get("/audit-logs", { preHandler: [authenticate] }, async (request, reply) => {
    const logs = await DBRepo.getAllAuditLogs();
    return reply.status(200).send({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  });

  // 8. List Regulatory Users & Roles (Module 2)
  fastify.get("/users", { preHandler: [authenticate] }, async (request, reply) => {
    const userList = await DBRepo.getAllUsers();
    return reply.status(200).send({
      success: true,
      data: {
        users: userList,
        count: userList.length,
      },
    });
  });
};
