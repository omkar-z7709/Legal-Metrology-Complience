"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusType } from "@/components/ui/Badge";
import { InspectionPerfPanel } from "@/components/inspection/InspectionPerfPanel";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  InspectionTimingReport,
  ResultViewTiming,
  loadInspectionTiming,
  saveInspectionTiming,
} from "@/lib/inspectionTiming";
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

  const [reviewDecision, setReviewDecision] = useState<"ACCEPT" | "REJECT" | "MANUAL_REVIEW">("ACCEPT");
  const [officerNotes, setOfficerNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // TEMP DEBUG INSTRUMENTATION — closes the browser stopwatch handed over by
  // /inspections/new once the result data has actually rendered.
  const [perfReport, setPerfReport] = useState<InspectionTimingReport | null>(null);
  const resultViewRef = useRef<ResultViewTiming | null>(null);
  const stopwatchClosedRef = useRef(false);

  const loadInspection = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchStart = performance.now();
      const scanStart = performance.now();
      const scanPromise = fetch(`${API_BASE_URL}/api/scans/${id}`, {
        headers: { authorization: "Bearer dev-inspector" },
      }).then(async (res) => ({
        res,
        json: await res.json(),
        ms: performance.now() - scanStart,
      }));

      const auditStart = performance.now();
      const auditPromise = fetch(`${API_BASE_URL}/api/inspections/${id}/audit`, {
        headers: { authorization: "Bearer dev-inspector" },
      }).then(async (res) => ({
        res,
        json: await res.json().catch(() => ({ data: { auditHistory: [] } })),
        ms: performance.now() - auditStart,
      }));

      const [scan, audit] = await Promise.all([scanPromise, auditPromise]);
      const fetchMs = performance.now() - fetchStart;

      resultViewRef.current = {
        fetchMs,
        scanFetchMs: scan.ms,
        auditFetchMs: audit.ms,
        routePushMs: null,
      };

      if (!scan.res.ok || !scan.json.success || !scan.json.data) {
        throw new Error("Scan record not found.");
      }

      setScanData({
        scan: scan.json.data.scan,
        images: scan.json.data.images,
        analysis: scan.json.data.analysis,
      });

      if (audit.json.success && audit.json.data?.auditHistory) {
        setAuditHistory(audit.json.data.auditHistory);
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

  // Close the stopwatch on the frame after the result is painted, so "total user
  // time" reflects what the inspector actually waited through.
  useEffect(() => {
    if (loading || error || !scanData || stopwatchClosedRef.current) return;
    stopwatchClosedRef.current = true;
    const handoff = loadInspectionTiming(id);
    if (!handoff) return;
    requestAnimationFrame(() => {
      const final: InspectionTimingReport = {
        ...handoff,
        resultView: resultViewRef.current,
        totalUserMs: performance.now() - handoff.browser.t0,
      };
      setPerfReport(final);
      saveInspectionTiming(final);
    });
  }, [loading, error, scanData, id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((reviewDecision === "REJECT" || reviewDecision === "MANUAL_REVIEW") && !officerNotes.trim()) {
      setReviewMessage("❌ Comment required for non-compliant or manual review decisions.");
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
          reason: officerNotes.trim() || "Verified packaging declarations.",
        }),
      });

      const result = await res.json();
      if (result.success) {
        setReviewMessage(`✓ Decision logged as '${reviewDecision}'.`);
        setOfficerNotes("");
        await loadInspection();
      } else {
        throw new Error(result.error?.message || "Failed to record decision");
      }
    } catch (err: any) {
      setReviewMessage(`❌ Error saving decision: ${err.message}`);
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
        throw new Error(`Report generation failed (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Inspection_${scanData?.scan?.scanNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      console.error("Download error:", err);
      alert(`Failed to download report: ${err.message}`);
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
            <p className="text-sm text-slate-600 font-medium">
              Loading inspection record...
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
          <div className="max-w-md w-full text-center bg-white rounded-xl border border-red-200 p-8 shadow-sm">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Record Unavailable
            </h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <Link
              href="/inspections"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Back to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const analysis = scanData?.analysis;
  const scan = scanData?.scan;
  const reliability = analysis?.extractionReliability ?? null;
  const unverifiedChecks = (analysis?.reviewChecks ?? []).filter(
    (c: any) => c.title?.startsWith("[Unverified]"),
  );
  const originalImages = scanData?.images?.filter((i: any) => i.imageType === "ORIGINAL") || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbs={[
            { label: "Inspections", href: "/inspections" },
            { label: scan?.scanNumber || "Details" },
          ]}
        />
        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {scan?.scanNumber || "N/A"}
                </span>
                <StatusBadge
                  status={(analysis?.complianceStatus as StatusType) || "REQUIRES_REVIEW"}
                  size="md"
                />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-2">
                {analysis?.declarations?.generic_name?.value ?? "Commodity Inspection"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Category: {analysis?.classification?.category || "Unknown"} • Location: {scan?.location || "N/A"}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              loading={isGeneratingReport}
              icon={<Download className="w-4 h-4" />}
            >
              Export Report
            </Button>
          </div>

          {reliability && reliability.verdict !== "RELIABLE" && (
            <div
              className={`rounded-xl border p-5 ${
                reliability.verdict === "UNRELIABLE"
                  ? "bg-red-50 border-red-300"
                  : "bg-amber-50 border-amber-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    reliability.verdict === "UNRELIABLE"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">
                    {reliability.verdict === "UNRELIABLE"
                      ? "Automated result is UNRELIABLE — do not act on it"
                      : "Automated result is DEGRADED — officer confirmation required"}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">
                    Text extraction from the package images was not reliable enough to
                    support a compliance determination.
                  </p>

                  <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                    {reliability.reasons.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/70 rounded border border-slate-200 px-3 py-2">
                      <div className="text-slate-500">OCR provider</div>
                      <div className="font-mono font-semibold text-slate-900">
                        {reliability.ocrProvider}
                      </div>
                    </div>
                    <div className="bg-white/70 rounded border border-slate-200 px-3 py-2">
                      <div className="text-slate-500">Mean OCR confidence</div>
                      <div className="font-mono font-semibold text-slate-900">
                        {Math.round(reliability.ocrAverageConfidence * 100)}%
                      </div>
                    </div>
                    <div className="bg-white/70 rounded border border-slate-200 px-3 py-2">
                      <div className="text-slate-500">Declarations recovered</div>
                      <div className="font-mono font-semibold text-slate-900">
                        {reliability.mandatoryFieldsDetected}/
                        {reliability.mandatoryFieldsTotal}
                      </div>
                    </div>
                    <div className="bg-white/70 rounded border border-slate-200 px-3 py-2">
                      <div className="text-slate-500">Findings downgraded</div>
                      <div className="font-mono font-semibold text-slate-900">
                        {reliability.absenceChecksDowngraded}
                      </div>
                    </div>
                  </div>

                  {reliability.missingMandatoryFields.length > 0 && (
                    <p className="mt-3 text-xs text-slate-600">
                      Not recovered:{" "}
                      <span className="font-medium">
                        {reliability.missingMandatoryFields.join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <CardHeader
                  title="Evidence"
                  description="Packaging images retrieved during field inspection."
                />
                <CardBody>
                  <div className="grid grid-cols-2 gap-4">
                    {originalImages.map((img: any, idx: number) => (
                      <div key={img.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <img
                          src={img.url}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-48 object-contain bg-slate-50"
                        />
                        <div className="p-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200 text-center">
                          Image {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Extracted Declarations"
                  description="System extraction of mandatory fields (Rule 6). Verification required."
                />
                <div className="divide-y divide-slate-100 text-sm">
                  {[
                    { label: "Generic Name", val: analysis?.declarations?.generic_name, rule: "Rule 6(1)(b)" },
                    { label: "Net Quantity", val: analysis?.declarations?.net_quantity, rule: "Rule 6(1)(c)" },
                    { label: "MRP", val: analysis?.declarations?.mrp, rule: "Rule 6(1)(e)" },
                    { label: "Date of Manufacture", val: analysis?.declarations?.date_of_manufacture, rule: "Rule 6(1)(d)" },
                    { label: "Consumer Care", val: analysis?.declarations?.consumer_care, rule: "Rule 6(1)(f)" },
                    { label: "Country of Origin", val: analysis?.declarations?.country_of_origin, rule: "Rule 6(1)(g)" },
                  ].map((decl, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{decl.label}</div>
                        <div className="text-xs text-slate-500">{decl.rule}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-900">{decl.val?.value || "Not detected"}</div>
                        {decl.val?.value ? (
                          <div className="text-xs text-slate-400 font-mono">
                            System Conf: {Math.round((decl.val.confidence ?? 0) * 100)}%
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 font-medium">
                            Unverified — needs officer check
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Card>
                <CardHeader
                  title="Findings (Rule Violations)"
                  description="Automated compliance checks requiring officer review."
                />
                <CardBody className="space-y-4">
                  {analysis?.violations && analysis.violations.length > 0 ? (
                    analysis.violations.map((v: any, idx: number) => (
                      <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                        <div className="font-semibold text-red-900 mb-1">
                          [{v.ruleNumber}] {v.title}
                        </div>
                        <div className="text-red-700 mb-2">{v.reason}</div>
                        <div className="text-xs text-slate-600 bg-white p-2 rounded border border-red-100">
                          <strong>Source:</strong> {v.evidence}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-start gap-3">
                      <Scale className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-900">No Automated Findings</div>
                        <div className="text-slate-600 mt-1">
                          System checks did not flag any explicit rule violations. Officer verification is still mandatory.
                        </div>
                      </div>
                    </div>
                  )}

                  {unverifiedChecks.length > 0 && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-semibold text-amber-800">
                          Unverified — requires physical inspection ({unverifiedChecks.length})
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">
                        These checks concluded that a declaration was absent. Because the
                        text layer was not read reliably, absence is not evidence of
                        absence. Do not issue notice on these without manual verification.
                      </p>
                      <div className="space-y-3">
                        {unverifiedChecks.map((c: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                          >
                            <div className="font-semibold text-amber-900 mb-1">
                              [{c.ruleNumber}]{" "}
                              {c.title?.replace("[Unverified] ", "")}
                            </div>
                            <div className="text-amber-800 mb-2">{c.reason}</div>
                            <div className="text-xs text-slate-600 bg-white p-2 rounded border border-amber-100">
                              <strong>Source:</strong> {c.evidence}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Officer Decision"
                  description="Final legal determination by enforcement officer."
                />
                <CardBody>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900">Decision Outcome</label>
                      <select
                        value={reviewDecision}
                        onChange={(e) => setReviewDecision(e.target.value as any)}
                        disabled={isSubmittingReview}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="ACCEPT">Compliant (No Action Required)</option>
                        <option value="REJECT">Non-Compliant (Issue Notice/Seizure)</option>
                        <option value="MANUAL_REVIEW">Requires Further Manual Review</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900">Enforcement Notes</label>
                      <textarea
                        value={officerNotes}
                        onChange={(e) => setOfficerNotes(e.target.value)}
                        placeholder="Detail reasoning, evidence referenced, or statutory basis..."
                        required={reviewDecision !== "ACCEPT"}
                        rows={4}
                        className="w-full p-3 text-sm border border-slate-200 rounded-lg bg-white"
                        disabled={isSubmittingReview}
                      />
                    </div>

                    {reviewMessage && (
                      <div className={`p-3 text-sm rounded-lg ${reviewMessage.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {reviewMessage}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      loading={isSubmittingReview}
                    >
                      Record Decision
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>
          </div>

          <InspectionPerfPanel report={perfReport} />
        </main>
      </div>
    </div>
  );
}