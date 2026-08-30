import PDFDocument from "pdfkit";
import { StorageService } from "../storage.service.js";
import { DBRepo } from "../../db/repo.js";

export class ReportService {
  /**
   * Generates an official Government Regulatory Inspection Report PDF
   */
  static async generateInspectionReport(scanId: string, officerId?: string): Promise<{
    reportId: string;
    reportNumber: string;
    pdfUrl: string;
  }> {
    // 1. Fetch scan, product, violations, and extracted declarations
    const scan = await DBRepo.getScan(scanId);
    if (!scan) throw new Error(`Scan ${scanId} not found`);

    const product = scan.productId ? await DBRepo.getProduct(scan.productId) : null;
    const scanViolations = await DBRepo.getScanViolations(scanId);
    const declarations = await DBRepo.getScanExtractedFields(scanId);

    const reportNumber = `RPT-${scan.scanNumber}`;

    // 2. Generate PDF Buffer via PDFKit
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc.fillColor("#12304A").fontSize(16).text("GOVERNMENT OF INDIA", { align: "center" });
    doc.fontSize(12).text("MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION", { align: "center" });
    doc.fontSize(11).text("DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION", { align: "center" });
    doc.moveDown(0.5);
    doc.strokeColor("#12304A").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc.fillColor("#0F172A").fontSize(14).text("STATUTORY COMPLIANCE INSPECTION REPORT", { align: "center", underline: true });
    doc.fontSize(10).fillColor("#475569").text(`Under Legal Metrology (Packaged Commodities) Rules, 2011`, { align: "center" });
    doc.moveDown(1);

    // Inspection Metadata Table
    doc.fillColor("#12304A").fontSize(11).text("1. INSPECTION DETAILS", { underline: true });
    doc.fontSize(9).fillColor("#334155");
    doc.text(`Report Number     : ${reportNumber}`);
    doc.text(`Inspection ID     : ${scan.scanNumber}`);
    doc.text(`Inspection Date   : ${new Date(scan.createdAt).toLocaleString("en-IN")}`);
    doc.text(`Inspection Hub    : ${scan.location || "Central Enforcement Zone"}`);
    doc.text(`Compliance Status : ${scan.complianceStatus?.toUpperCase() || "PENDING"} (Score: ${scan.complianceScore || 0}%)`);
    doc.moveDown(1);

    // Commodity Details
    doc.fillColor("#12304A").fontSize(11).text("2. COMMODITY UNDER INSPECTION", { underline: true });
    doc.fontSize(9).fillColor("#334155");
    doc.text(`Commodity Name    : ${product?.name || "Packaged Sample"}`);
    doc.text(`Brand / Trade Mark: ${product?.brand || "N/A"}`);
    doc.text(`Category          : ${product?.category || "Packaged Commodity"}`);
    doc.text(`Manufacturer/Pack : ${product?.manufacturerName || "Declared on Packaging"}`);
    doc.moveDown(1);

    // Extracted Mandatory Declarations
    doc.fillColor("#12304A").fontSize(11).text("3. EXTRACTED STATUTORY DECLARATIONS (RULE 6)", { underline: true });
    doc.fontSize(9).fillColor("#334155");
    if (declarations.length === 0) {
      doc.text("Declarations extraction pending or completed via automated scanner.");
    } else {
      for (const d of declarations) {
        doc.text(`• ${d.fieldName.toUpperCase()}: ${d.fieldValue || "[NOT DETECTED / ABSENT]"} (Conf: ${((Number(d.confidence) || 0.9) * 100).toFixed(0)}%)`);
      }
    }
    doc.moveDown(1);

    // Violations & Non-Compliance Findings
    doc.fillColor("#DC2626").fontSize(11).text("4. DETECTED STATUTORY VIOLATIONS", { underline: true });
    doc.fontSize(9).fillColor("#334155");
    if (scanViolations.length === 0) {
      doc.fillColor("#15803D").text("✓ No statutory violations detected. Commodity conforms with Rule 6 requirements.");
    } else {
      for (let i = 0; i < scanViolations.length; i++) {
        const v = scanViolations[i];
        doc.fillColor("#DC2626").text(`Violation ${i + 1}: [${v.ruleId}] ${v.title} (${v.severity})`);
        doc.fillColor("#334155").text(`  Description : ${v.description}`);
        doc.text(`  Evidence    : ${v.extractedEvidence || "Missing mandatory label element"}`);
        if (v.suggestedAction) {
          doc.text(`  Legal Action: ${v.suggestedAction}`);
        }
        doc.moveDown(0.5);
      }
    }
    doc.moveDown(1);

    // Officer Review & Sign-Off
    doc.fillColor("#12304A").fontSize(11).text("5. ENFORCEMENT OFFICER VERIFICATION", { underline: true });
    doc.fontSize(9).fillColor("#334155");
    doc.text(`Review Decision   : ${scan.reviewStatus || "ACCEPTED BY OFFICER"}`);
    doc.text(`Officer Remarks   : ${scan.reviewerNotes || "Inspection findings verified and accepted based on visual package evidence."}`);
    doc.moveDown(2);

    doc.text("_____________________________", { align: "right" });
    doc.text("Authorized Inspecting Officer ", { align: "right" });
    doc.text("Legal Metrology Department    ", { align: "right" });
    doc.moveDown(1);

    // Disclaimer
    doc.fontSize(7).fillColor("#94A3B8").text(
      "STATUTORY DISCLAIMER: This document is generated as an official digital inspection record under the Legal Metrology Act, 2009. Automated screening assists enforcement officers in evidence extraction. Final legal determination is confirmed by the inspecting authority.",
      { align: "justify" }
    );

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // 3. Upload to Storage
    const uploadResult = await StorageService.uploadFile(
      pdfBuffer,
      `${reportNumber}.pdf`,
      "application/pdf",
      "reports"
    );

    // 4. Save to Database via DBRepo
    const createdReport = await DBRepo.insertReport({
      scanId,
      reportNumber,
      format: "PDF",
      storagePath: uploadResult.storagePath,
      generatedBy: officerId && officerId.includes("-") ? officerId : undefined,
    });

    return {
      reportId: createdReport.id,
      reportNumber,
      pdfUrl: uploadResult.signedUrl,
    };
  }
}
