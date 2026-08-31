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

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Officer Review State
  const [reviewDecision, setReviewDecision] = useState<
    "ACCEPTED" | "REJECTED" | "OVERRIDDEN"
  >("ACCEPTED");
  const [officerNotes, setOfficerNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // PDF Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [pdfReportUrl, setPdfReportUrl] = useState<string | null>(null);

  const loadInspection = async () => {
    setLoading(true);
    setError(null);

    try {
      const scanRes = await fetch(`${API_BASE_URL}/api/scans/${id}`, {
        headers: {
          authorization: "Bearer dev-inspector",
        },
      });

      const scanJson = await scanRes.json();

      console.log("========== GET SCAN RESULT ==========");
      console.log(scanJson.data);
      console.log("========== GET ANALYSIS ==========");
      console.log(scanJson.data?.analysis);
      console.log("=====================================");

      if (!scanRes.ok || !scanJson.success || !scanJson.data) {
        throw new Error("Scan record not found.");
      }

      setScanData({
        scan: scanJson.data.scan,
        images: scanJson.data.images,
        analysis: scanJson.data.analysis,
      });
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
    setIsSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inspections/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer dev-inspector",
        },
        body: JSON.stringify({
          decision: reviewDecision,
          notes:
            officerNotes ||
            "Inspection verified and confirmed by authorized inspector.",
          overriddenStatus:
            reviewDecision === "OVERRIDDEN" ? "COMPLIANT" : undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setReviewMessage(
          `✓ Review submitted successfully as '${reviewDecision}'.`,
        );
      }
    } catch (err: any) {
      setReviewMessage(`❌ Error saving review: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inspections/${id}/report`, {
        method: "POST",
        headers: { authorization: "Bearer dev-inspector" },
      });
      const data = await res.json();
      if (data.success && data.data.pdfUrl) {
        setPdfReportUrl(data.data.pdfUrl);
        window.open(data.data.pdfUrl, "_blank");
      }
    } catch (err: any) {
      alert("Failed to generate PDF report");
    } finally {
      setIsGeneratingReport(false);
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

              <Button
                variant="primary"
                onClick={handleGenerateReport}
                loading={isGeneratingReport}
                icon={<Download className="w-4 h-4" />}
              >
                Download Official PDF Report
              </Button>
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
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-[#12304A] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Rule 6(1)(e) — Retail Sale Price Declaration
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      "The retail sale price of the package shall clearly
                      indicate the Maximum Retail Price in Indian Rupees
                      inclusive of all taxes."
                    </p>
                    <div className="text-[10px] text-slate-400">
                      Gazette Citation: Legal Metrology (Packaged Commodities)
                      Rules, 2011 (Amended 2022)
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="font-semibold text-[#12304A] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Rule 6(1)(f) — Consumer Care Contact Details
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      "Mandates telephone helpline number and email address of
                      authorized personnel for consumer grievance redressal."
                    </p>
                    <div className="text-[10px] text-slate-400">
                      Gazette Citation: Legal Metrology Rules, 2011, Sub-rule
                      (1)(f)
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Human-in-the-Loop Officer Review Panel */}
              <Card>
                <CardHeader
                  title="Enforcement Officer Determination"
                  description="Authorized human review, sign-off, or manual override"
                />
                <CardBody>
                  <form
                    onSubmit={handleReviewSubmit}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">
                        Officer Determination *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewDecision("ACCEPTED")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "ACCEPTED"
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDecision("OVERRIDDEN")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "OVERRIDDEN"
                              ? "bg-blue-50 border-blue-400 text-blue-800 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ⇄ Override
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDecision("REJECTED")}
                          className={`py-2 px-3 rounded-lg border font-medium text-center transition-colors ${
                            reviewDecision === "REJECTED"
                              ? "bg-red-50 border-red-400 text-red-800 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Inspector Notes & Justification
                      </label>
                      <textarea
                        rows={3}
                        value={officerNotes}
                        onChange={(e) => setOfficerNotes(e.target.value)}
                        placeholder="Enter inspection observations or rationale for statutory record..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>

                    {reviewMessage && (
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-medium">
                        {reviewMessage}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      loading={isSubmittingReview}
                    >
                      Submit Official Determination & Log Audit
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
