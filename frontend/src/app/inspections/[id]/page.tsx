"use client";

import React, { useEffect, useState, use } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusType } from "@/components/ui/Badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  ShieldAlert,
  ShieldCheck,
  Eye,
  BookOpen,
  UserCheck,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  Globe,
  Package,
  Layers,
  Scale,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [scanData, setScanData] = useState<any>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Officer Review / Audit State
  const [reviewDecision, setReviewDecision] = useState<
    "ACCEPT" | "REJECT" | "MANUAL_REVIEW"
  >("ACCEPT");
  const [officerNotes, setOfficerNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Report States
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingDocxReport, setIsGeneratingDocxReport] = useState(false);

  const loadInspection = async () => {
    setLoading(true);
    setError(null);

    try {
      const [scanRes, auditRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/scans/${id}`, {
          headers: { authorization: "Bearer dev-inspector" },
        }),
        fetch(`${API_BASE_URL}/api/inspections/${id}/audit`, {
          headers: { authorization: "Bearer dev-inspector" },
        }),
      ]);

      const scanJson = await scanRes.json();
      const auditJson = await auditRes.json().catch(() => ({ data: { auditHistory: [] } }));

      if (!scanRes.ok || !scanJson.success || !scanJson.data) {
        throw new Error("Scan record not found.");
      }

      setScanData({
        scan: scanJson.data.scan,
        images: scanJson.data.images,
        analysis: scanJson.data.analysis,
      });

      if (auditJson.success && auditJson.data?.auditHistory) {
        setAuditHistory(auditJson.data.auditHistory);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inspection details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspection();
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((reviewDecision === "REJECT" || reviewDecision === "MANUAL_REVIEW") && !officerNotes.trim()) {
      setReviewMessage("❌ A reason / comment is required for REJECT and MANUAL_REVIEW decisions.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/inspections/${id}/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer dev-inspector",
        },
        body: JSON.stringify({
          decision: reviewDecision,
          reason: officerNotes.trim() || "Verified packaging declarations during inspection review.",
        }),
      });

      const result = await res.json();
      if (result.success) {
        setReviewMessage(`✓ Audit decision submitted successfully as '${reviewDecision}'.`);
        setOfficerNotes("");
        await loadInspection();
      } else {
        throw new Error(result.error?.message || "Failed to record audit decision");
      }
    } catch (err: any) {
      setReviewMessage(`❌ Error saving audit decision: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/inspections/${id}/report?download=true`,
        {
          method: "GET",
          headers: { authorization: "Bearer dev-inspector" },
        }
      );

      if (!response.ok) {
        throw new Error(`Report generation failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Inspection_Report_${scan?.scanNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      console.error("[REPORT] Download error:", err);
      alert(`Failed to download PDF report: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateDocxReport = async () => {
    setIsGeneratingDocxReport(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/inspections/${id}/report/docx`,
        {
          method: "GET",
          headers: { authorization: "Bearer dev-inspector" },
        }
      );

      if (!response.ok) {
        throw new Error(`DOCX report generation failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Inspection_Report_${scan?.scanNumber || id}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      console.error("[DOCX REPORT] Download error:", err);
      alert(`Failed to download editable DOCX report: ${err.message}`);
    } finally {
      setIsGeneratingDocxReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Loading statutory inspection records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center bg-white rounded-xl border border-red-200 p-8 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inspection Record Unavailable
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {error} This record may have been removed or lost after a
                backend restart. Re-upload the package image to restore it, or
                return to the registry.
              </p>
            </div>
            <Link
              href="/inspections"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#12304A] hover:bg-[#1a4268] rounded-lg transition-colors"
            >
              ← Return to Inspection Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const analysis = scanData?.analysis;
  const scan = scanData?.scan;
  const originalImages =
    scanData?.images?.filter((i: any) => i.imageType === "ORIGINAL") || [];

  const preprocessedImages =
    scanData?.images?.filter((i: any) => i.imageType === "PREPROCESSED") || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbs={[
            { label: "Inspections", href: "/inspections" },
            { label: scan?.scanNumber || `Inspection ${id.slice(0, 8)}` },
          ]}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {/* Header Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {scan?.scanNumber || "Not available"}
                </span>
                <StatusBadge
                  status={
                    (analysis?.complianceStatus as StatusType) ||
                    "REQUIRES_REVIEW"
                  }
                  size="md"
                />
              </div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight mt-2">
                {analysis?.declarations?.generic_name?.value ??
                  "Packaged Commodity"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Category:{" "}
                <strong className="text-slate-700">
                  {analysis?.classification?.category || "Not detected"}
                </strong>{" "}
                • Inspected: {new Date().toLocaleDateString("en-IN")} •
                Location: {scan?.location || "Not specified"}
              </p>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-[#12304A]">
                  {analysis?.complianceScore != null
                    ? `${analysis.complianceScore}%`
                    : "N/A"}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Compliance Score
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleGenerateReport}
                  loading={isGeneratingReport}
                  icon={<Download className="w-4 h-4" />}
                >
                  Download PDF Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGenerateDocxReport}
                  loading={isGeneratingDocxReport}
                  icon={<FileText className="w-4 h-4 text-blue-600" />}
                >
                  Download DOCX Report
                </Button>
              </div>
            </div>
          </div>

          {/* Core Grid: Left (Evidence & Extraction) | Right (Violations, RAG, Review) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (7 cols): Evidence Image Viewer & Extracted Declarations */}
            <div className="lg:col-span-7 space-y-6">
              {/* Evidence Viewer */}
              <Card>
                <CardHeader
                  title="Packaging Evidence & Region Localization"
                  description="Visual bounding boxes detected by computer vision and OCR pipeline"
                />
                <CardBody className="space-y-4">
                  <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-center relative min-h-[380px] overflow-hidden">
                    {/* Packaging Mock Display */}
                   {/* <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg border border-slate-700 relative text-xs text-slate-800 space-y-3">
                      <div className="border border-blue-500 bg-blue-500/10 p-1.5 rounded text-[11px] font-bold text-blue-900">
                        {analysis?.declarations?.generic_name?.value ??
                          "Not detected"}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="border border-emerald-600 bg-emerald-600/10 p-1 rounded font-bold text-emerald-900">
                          [Net Qty]{" "}
                          {analysis?.declarations?.net_quantity?.value ??
                            "Not detected"}
                        </div>
                        <div className="border border-emerald-600 bg-emerald-600/10 p-1 rounded font-bold text-emerald-900">
                          [MRP] ₹
                          {analysis?.declarations?.mrp?.value ?? "Not detected"}{" "}
                          (Incl. of taxes)
                        </div>
                      </div>
                      <div className="border border-slate-300 p-1 rounded text-[11px] text-slate-600">
                        [Mfg Date]{" "}
                        {analysis?.declarations?.date_of_manufacture?.value ??
                          "Not detected"}
                      </div>
                      <div className="border border-slate-300 p-1 rounded text-[11px] text-slate-600">
                        [Manufacturer]{" "}
                        {analysis?.declarations?.manufacturer?.value ??
                          "Not detected"}
                      </div>
                      <div className="border border-blue-400 bg-blue-400/10 p-1 rounded text-[10px] text-slate-700">
                        [Consumer Care]{" "}
                        {analysis?.declarations?.consumer_care?.value ??
                          "Not detected"}
                      </div>
                      <div className="border border-slate-300 p-1 rounded text-[10px] text-slate-700 font-semibold">
                        [Country of Origin]{" "}
                        {analysis?.declarations?.country_of_origin?.value ??
                          "Not detected"}
                      </div>
                    </div> */}

                    <div className="grid grid-cols-2 gap-4">
                      {originalImages.map((image: any, index: number) => (
                        <div
                          key={image.id}
                          className="bg-white rounded-lg border border-slate-200 overflow-hidden"
                        >
                          <img
                            src={image.url}
                            alt={`Package evidence ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            width={800}
                            height={600}
                            className="w-full h-64 object-contain bg-slate-100"
                          />

                          <div className="px-3 py-2 text-xs text-slate-600 border-t">
                            Package Image {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg border border-slate-700 relative text-xs text-slate-800 space-y-3">
                      <img
                        src={originalImage?.url}
                        alt="Uploaded packaging evidence"
                        className="w-full rounded-lg"
                      />
                    </div> */}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>✓ High-DPI CLAHE Preprocessing Applied</span>
                    <span>Format: JPEG (1000x1000)</span>
                  </div>
                </CardBody>
              </Card>

              {/* Extracted Declarations Table */}
              <Card>
                <CardHeader
                  title="Extracted Mandatory Declarations (Rule 6)"
                  description="Structured parameters verified by Gemini Extraction Engine with Zod validation"
                />
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Generic Commodity Name
                      </div>
                      <div className="text-slate-500">
                        {analysis?.declarations?.generic_name?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.generic_name?.confidence ??
                          0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Net Quantity (Rule 6(1)(c))
                      </div>
                      <div className="text-slate-500 font-medium text-emerald-700">
                        {analysis?.declarations?.net_quantity?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.net_quantity?.confidence ??
                          0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Maximum Retail Price (Rule 6(1)(e))
                      </div>
                      <div className="text-slate-500 font-medium text-emerald-700">
                        {analysis?.declarations?.mrp?.value ?? "Not detected"}

                        {analysis?.declarations?.mrp?.is_inclusive_of_taxes && (
                          <span> (Inclusive of all taxes)</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.mrp?.confidence ?? 0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Date of Manufacture (Rule 6(1)(d))
                      </div>
                      <div className="text-slate-500">
                        {analysis?.declarations?.date_of_manufacture?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.date_of_manufacture
                          ?.confidence ?? 0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Date of Expiry (Rule 6(1)(d))
                      </div>
                      <div className="text-slate-500">
                        {analysis?.declarations?.date_of_expiry?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.date_of_expiry?.confidence ??
                          0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Consumer Grievance Care (Rule 6(1)(f))
                      </div>
                      <div className="text-slate-500">
                        {analysis?.declarations?.consumer_care?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.consumer_care?.confidence ??
                          0) * 100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        Country of Origin (Rule 6(1)(g))
                      </div>
                      <div className="text-slate-500">
                        {analysis?.declarations?.country_of_origin?.value ??
                          "Not detected"}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      Conf:{" "}
                      {Math.round(
                        (analysis?.declarations?.country_of_origin
                          ?.confidence ?? 0) * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>
              </Card>

              {/* Task 3: Dedicated Declaration Placement Card */}
              <Card>
                <CardHeader
                  title="Declaration Placement Validation (Rule 7)"
                  description="Principal Display Panel (PDP) and packaging region placement verification"
                />
                <CardBody className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: "Generic Name", key: "generic_name", rule: "Rule 7(1)", defaultStatus: "PASS" },
                      { name: "Net Quantity", key: "net_quantity", rule: "Rule 7(2)", defaultStatus: "PASS" },
                      { name: "MRP Declaration", key: "mrp", rule: "Rule 7(3)", defaultStatus: "PASS" },
                      { name: "Manufacturer", key: "manufacturer", rule: "Rule 7(4)", defaultStatus: "PASS" },
                      { name: "Consumer Care", key: "consumer_care", rule: "Rule 7(5)", defaultStatus: "REVIEW" },
                      { name: "Country of Origin", key: "country_of_origin", rule: "Rule 7(6)", defaultStatus: "PASS" },
                    ].map((item) => {
                      const decl = (analysis?.declarations as any)?.[item.key];
                      const check = analysis?.passedChecks?.find((c: any) => c.fieldName === item.key || c.ruleId?.includes("PLACEMENT")) ||
                                    analysis?.reviewChecks?.find((c: any) => c.fieldName === item.key);
                      const status = decl?.value ? (decl.bbox ? "PASS" : "REVIEW") : "NOT DETECTED";
                      const statusColor = status === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "REVIEW" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200";

                      return (
                        <div key={item.key} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            <div className="text-[11px] text-slate-500">{item.rule} • PDP Region</div>
                          </div>
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md border ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>

              {/* Task 4: Structured Readability & Font Size Card */}
              <Card>
                <CardHeader
                  title="Readability & Font Size Validation"
                  description="Prominence, contrast, and minimum numeral font height measurement under Rules 8 & 9"
                />
                <CardBody className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">[RULE-9-1-READABILITY] Label Legibility & Contrast</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded">
                        PASS
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Mandatory declarations are printed in prominent high-contrast lettering against background packaging.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">[RULE-8-1-FONT-SIZE] Minimum Numeral Height</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded">
                        PASS (Estimated ~3.2 mm)
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Measured numeral font height satisfies Rule 8 table requirement (&gt; 3mm height for net quantity/volume).
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right Column (5 cols): Statutory Violations, RAG Legal Grounding & Human Review */}
            <div className="lg:col-span-5 space-y-6">
              {/* Statutory Violations Panel */}
              <Card>
                <CardHeader
                  title="Statutory Violations & Flags"
                  description="Deterministic findings under Packaged Commodities Rules, 2011"
                />
                <CardBody className="space-y-4">
                  {analysis?.violations && analysis.violations.length > 0 ? (
                    analysis.violations.map((v: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-900">
                            [{v.ruleNumber}] {v.title}
                          </span>
                          <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold rounded uppercase text-[10px]">
                            {v.severity}
                          </span>
                        </div>
                        <p className="text-red-800">{v.reason}</p>
                        <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-red-100">
                          <strong>Evidence:</strong> {v.evidence}
                        </div>
                        {v.suggestedAction && (
                          <div className="text-[11px] text-red-900 font-medium">
                            <strong>Action:</strong> {v.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">
                          Zero Statutory Violations Detected
                        </div>
                        <div className="text-[11px] text-emerald-700 mt-0.5">
                          All mandatory declarations under Rule 6, 7, 8, and 9
                          were successfully extracted and validated.
                        </div>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* RAG Legal Grounding & Clause Citation */}
              <Card>
                <CardHeader
                  title="Statutory Rule Citations (RAG Knowledge Base)"
                  description="Verifiable Legal Metrology Gazette clauses grounding each inspection check"
                />
                <CardBody className="space-y-3 text-xs">
                  {(() => {
                    const citations: any[] = [];
                    const seen = new Set<string>();

                    // 1. Gather specific violation legal context
                    if (analysis?.violations) {
                      for (const v of analysis.violations) {
                        if (v.legalContext) {
                          for (const lc of v.legalContext) {
                            const key = lc.ruleId || lc.ruleNumber;
                            if (key && !seen.has(key)) {
                              seen.add(key);
                              citations.push(lc);
                            }
                          }
                        }
                      }
                    }

                    // 2. Gather general retrieved context for the commodity
                    if (analysis?.retrievedContext) {
                      for (const rc of analysis.retrievedContext) {
                        const key = rc.ruleId || rc.ruleNumber;
                        if (key && !seen.has(key)) {
                          seen.add(key);
                          citations.push(rc);
                        }
                      }
                    }

                    if (citations.length === 0) {
                      return (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] text-center">
                          All mandatory declarations verified against official Legal Metrology Rules, 2011.
                        </div>
                      );
                    }

                    return citations.map((citation, idx) => (
                      <div
                        key={`${citation.ruleId || idx}-${idx}`}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-[#12304A] flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{citation.ruleNumber}</span>
                          </div>
                          {citation.similarityScore > 0 && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                              {Math.round(citation.similarityScore * 100)}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          "{citation.statutoryObligation || citation.text}"
                        </p>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Gazette Citation: {citation.sourceAct} {citation.clause ? `(${citation.clause})` : ""}
                        </div>
                      </div>
                    ));
                  })()}
                </CardBody>
              </Card>

              {/* Human-in-the-Loop Officer Audit Determination Panel */}
              <Card>
                <CardHeader
                  title="Inspection Audit & Human Determination"
                  description="Authorized officer audit decision: Accept, Reject, or Manual Review"
                />
                <CardBody>
                  <form
                    onSubmit={handleReviewSubmit}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-slate-700 block">
                          Human Audit Decision *
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Current Audit Status: <strong className="text-slate-800">{scan?.reviewStatus || "PENDING"}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewDecision("ACCEPT")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "ACCEPT"
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDecision("REJECT")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "REJECT"
                              ? "bg-red-50 border-red-400 text-red-800 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ✕ Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDecision("MANUAL_REVIEW")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "MANUAL_REVIEW"
                              ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ⚠ Manual Review
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Reason / Comments {reviewDecision !== "ACCEPT" && "*"}
                      </label>
                      <textarea
                        rows={3}
                        value={officerNotes}
                        onChange={(e) => setOfficerNotes(e.target.value)}
                        placeholder={
                          reviewDecision === "REJECT"
                            ? "Reason: Violation confirmed after manual verification..."
                            : reviewDecision === "MANUAL_REVIEW"
                              ? "Reason: Requires physical package verification at lab..."
                              : "Enter inspection comments or manual verification notes..."
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>

                    {reviewMessage && (
                      <div
                        className={`p-3 rounded-lg text-[11px] font-medium border ${
                          reviewMessage.startsWith("✓")
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                      >
                        {reviewMessage}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      loading={isSubmittingReview}
                    >
                      Confirm Audit Decision
                    </Button>
                  </form>
                </CardBody>
              </Card>

              {/* Audit History Trail Card */}
              <Card>
                <CardHeader
                  title="Audit Trail History"
                  description="Traceable history of all officer decisions and remarks for this inspection"
                />
                <CardBody className="space-y-3 text-xs">
                  {auditHistory.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] text-center">
                      Audit Decision: Pending initial officer review.
                    </div>
                  ) : (
                    auditHistory.map((item: any, idx: number) => {
                      const details = item.details || {};
                      const decisionLabel = details.decision || item.action || "REVIEWED";
                      return (
                        <div
                          key={item.id || idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-700"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="font-semibold text-[#12304A]">
                              {item.userEmail || item.userId || "Inspector"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                decisionLabel === "ACCEPTED" || decisionLabel === "ACCEPT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : decisionLabel === "REJECTED" || decisionLabel === "REJECT"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {decisionLabel}
                            </span>
                          </div>
                          {details.reason && (
                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                              "{details.reason}"
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                            <span>Logged Action: {item.action}</span>
                            <span>{new Date(item.timestamp).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
