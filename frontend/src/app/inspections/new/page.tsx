"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InspectionPerfPanel } from "@/components/inspection/InspectionPerfPanel";
import {
  Upload,
  ScanSearch,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Camera,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  BrowserTiming,
  InspectionTimingReport,
  PipelineReport,
  UploadReport,
  fmtMs,
  saveInspectionTiming,
} from "@/lib/inspectionTiming";

const REAL_STAGES = [
  { key: "UPLOADING", label: "Uploading images" },
  { key: "PREPROCESSING", label: "Processing image quality" },
  { key: "OCR", label: "Extracting raw text" },
  { key: "EXTRACTION", label: "Parsing mandatory declarations" },
  { key: "CLASSIFICATION", label: "Categorizing commodity" },
  { key: "COMPLIANCE", label: "Evaluating rules & compliance" },
  { key: "SAVING", label: "Saving inspection record" },
];

export default function NewInspectionPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Form Fields
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Edible Oils");
  const [brand, setBrand] = useState("");
  const [location, setLocation] = useState("");
  const [listingText, setListingText] = useState("");

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<string>("UPLOADING");
  const [error, setError] = useState<string | null>(null);

  // TEMP DEBUG INSTRUMENTATION — removable.
  const [elapsedMs, setElapsedMs] = useState(0);
  const [report, setReport] = useState<InspectionTimingReport | null>(null);
  const timingRef = useRef<BrowserTiming | null>(null);

  // Live stopwatch: ticks only while processing, so the displayed elapsed time is
  // a real sample of performance.now() - t0 rather than an incrementing fake.
  useEffect(() => {
    if (!isProcessing || !timingRef.current) return;
    const id = setInterval(() => {
      setElapsedMs(performance.now() - timingRef.current!.t0);
    }, 100);
    return () => clearInterval(id);
  }, [isProcessing]);

  const markPhase = (label: string, start: number, end: number) => {
    const t = timingRef.current;
    if (!t) return;
    const existing = t.phases.find((p) => p.label === label);
    if (existing) existing.end = end;
    else t.phases.push({ label, start, end });
  };

  // Record when the UI entered each stage. Combined with the live elapsed time
  // this yields frozen per-stage durations without any simulated progression.
  const lastStageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isProcessing || !timingRef.current) return;
    if (lastStageRef.current === activeStage) return;
    lastStageRef.current = activeStage;
    timingRef.current.stageTimeline.push({
      stage: activeStage,
      atMs: performance.now() - timingRef.current.t0,
    });
  }, [activeStage, isProcessing]);

  /** Frozen duration for a finished stage, live duration for the running one. */
  const durationFor = (stageKey: string): number | undefined => {
    const t = timingRef.current;
    if (!t) return undefined;
    const idx = t.stageTimeline.findIndex((s) => s.stage === stageKey);
    if (idx === -1) return undefined;
    const startAt = t.stageTimeline[idx].atMs;
    const next = t.stageTimeline[idx + 1];
    if (next) return next.atMs - startAt;
    if (t.stageTimeline[t.stageTimeline.length - 1].stage === stageKey) {
      return elapsedMs - startAt;
    }
    return undefined;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)
    );

    if (validFiles.length !== files.length) {
      setError("Only JPG, PNG, and WebP package images are allowed.");
    } else {
      setError(null);
    }

    if (validFiles.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [
      ...prev,
      ...validFiles.map((file) => URL.createObjectURL(file)),
    ]);

    if (!productName && validFiles[0]) {
      setProductName(validFiles[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  const handleSampleFill = () => {
    setProductName("SunPure Fortified Mustard Oil (1L)");
    setCategory("Edible Oils");
    setBrand("SunPure");
    setLocation("Retail Location");
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    if (selectedFiles.length === 0) {
      setError("Please select at least one commodity package image.");
      return;
    }

    const token = localStorage.getItem("lm_auth_token") || "dev-inspector";

    setError(null);
    setIsProcessing(true);
    setActiveStage("UPLOADING");

    // TEMP DEBUG INSTRUMENTATION — start the browser stopwatch here, at the exact
    // moment the submit is accepted, before any work is done.
    const t0 = performance.now();
    const timing: BrowserTiming = {
      t0,
      phases: [],
      pollCount: 0,
      pollWallMs: 0,
      firstPollDelayMs: null,
      stagesSeen: [],
      stageTimeline: [],
      submittedAt: Date.now(),
    };
    timingRef.current = timing;
    setElapsedMs(0);
    setReport(null);

    let isPolling = true;
    let uploadTiming: UploadReport | null = null;
    let pipelineTiming: PipelineReport | null = null;
    let gapUploadToAnalyzeMs: number | null = null;
    const scanIdForTiming = { current: null as string | null };

    try {
      const formDataStart = performance.now();
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("productName", productName || "Sample Commodity");
      formData.append("category", category);
      formData.append("brand", brand);
      formData.append("location", location);
      if (listingText) formData.append("listingText", listingText);
      markPhase("Build FormData", formDataStart, performance.now());

      const uploadStart = performance.now();
      const uploadRes = await fetch(`${API_BASE_URL}/api/scans/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadHeadersAt = performance.now();

      if (!uploadRes.ok) {
        throw new Error(`Upload failed (${uploadRes.status})`);
      }

      const uploadData = await uploadRes.json();
      const uploadParsedAt = performance.now();
      markPhase("POST /scans/upload (request → response headers)", uploadStart, uploadHeadersAt);
      markPhase("Parse upload JSON", uploadHeadersAt, uploadParsedAt);
      const scanId = uploadData.data.scanId;
      scanIdForTiming.current = scanId;
      uploadTiming = uploadData.data.timing ?? null;

      const pollScheduleStart = performance.now();
      const executePoll = async () => {
        if (!isPolling) return;
        try {
          const pollStart = performance.now();
          if (timing.firstPollDelayMs === null) {
            timing.firstPollDelayMs = pollStart - t0;
          }
          const pollRes = await fetch(`${API_BASE_URL}/api/scans/${scanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          timing.pollCount += 1;
          if (pollRes.ok) {
            const pollJson = await pollRes.json();
            if (pollJson.data?.scan?.currentStage) {
              const stage = pollJson.data.scan.currentStage as string;
              setActiveStage(stage);
              const atMs = performance.now() - t0;
              const last = timing.stagesSeen[timing.stagesSeen.length - 1];
              if (!last || last.stage !== stage) {
                timing.stagesSeen.push({ stage, atMs });
              }
            }
          }
          timing.pollWallMs += performance.now() - pollStart;
        } catch {
          /* poll failures are non-fatal; the analyze response is authoritative */
        }
        if (isPolling) {
          setTimeout(executePoll, 1000);
        }
      };
      setTimeout(executePoll, 500);

      gapUploadToAnalyzeMs = performance.now() - pollScheduleStart;
      const analyzeStart = performance.now();
      const analyzeRes = await fetch(`${API_BASE_URL}/api/inspections/${scanId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      isPolling = false;

      const analyzeHeadersAt = performance.now();
      const analyzeJson = await analyzeRes.json();
      const analyzeParsedAt = performance.now();
      markPhase("POST /inspections/:id/analyze (request → headers)", analyzeStart, analyzeHeadersAt);
      markPhase("Parse analyze JSON", analyzeHeadersAt, analyzeParsedAt);
      pipelineTiming = analyzeJson.timing ?? null;

      if (!analyzeRes.ok || !analyzeJson.success) {
        throw new Error(analyzeJson?.error?.message || "Analysis failed");
      }

      setActiveStage("COMPLETED");
      markPhase("Analysis finished → navigate", analyzeParsedAt, performance.now());

      // Hand the report to the result page so the stopwatch can be closed there.
      const partial: InspectionTimingReport = {
        scanId,
        browser: timing,
        backend: { upload: uploadTiming, pipeline: pipelineTiming },
        resultView: null,
        totalUserMs: null,
        gapUploadToAnalyzeMs,
      };
      setReport(partial);
      saveInspectionTiming(partial);
      router.push(`/inspections/${scanId}`);
    } catch (err: any) {
      console.error("Inspection submission error:", err);
      setError(err.message || "Failed to process inspection");
      setIsProcessing(false);

      // Preserve whatever was measured before the failure, then close the
      // stopwatch here since no result page will render to close it.
      if (scanIdForTiming.current) {
        const partial: InspectionTimingReport = {
          scanId: scanIdForTiming.current,
          browser: timing,
          backend: { upload: uploadTiming, pipeline: pipelineTiming },
          resultView: null,
          totalUserMs: performance.now() - t0,
          gapUploadToAnalyzeMs,
        };
        setReport(partial);
        saveInspectionTiming(partial);
      }
    } finally {
      isPolling = false;
    }
  };

  const getStageStatus = (stageKey: string) => {
    const stageOrder = REAL_STAGES.map((s) => s.key);
    const currentIndex = stageOrder.indexOf(activeStage);
    const targetIndex = stageOrder.indexOf(stageKey);

    if (activeStage === "COMPLETED") return "DONE";
    if (targetIndex < currentIndex) return "DONE";
    if (targetIndex === currentIndex) return "PROCESSING";
    return "PENDING";
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbs={[
            { label: "Inspections", href: "/inspections" },
            { label: "New Inspection" },
          ]}
        />

        <main className="p-8 max-w-5xl w-full mx-auto space-y-8 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                New Inspection
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Upload packaging images to evaluate compliance.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleSampleFill}
              disabled={isProcessing}
            >
              Load Demo Data
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            <Card>
              <CardHeader
                title="Analysis in Progress"
                description="Evaluating packaging against compliance rules."
              />
              <CardBody className="py-8 space-y-6">
                <div className="max-w-md mx-auto space-y-3">
                  {REAL_STAGES.map((st) => {
                    const status = getStageStatus(st.key);
                    const stageMs = durationFor(st.key);
                    return (
                      <div
                        key={st.key}
                        className={`flex items-center gap-3 p-4 rounded-lg border text-sm transition-colors ${
                          status === "DONE"
                            ? "bg-slate-50 border-slate-200 text-slate-600"
                            : status === "PROCESSING"
                            ? "bg-blue-50 border-blue-200 text-blue-900 font-medium"
                            : "bg-white border-slate-100 text-slate-400"
                        }`}
                      >
                        {status === "DONE" ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" />
                        ) : status === "PROCESSING" ? (
                          <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-200 shrink-0" />
                        )}
                        <div className="flex-1">
                          {st.label}
                        </div>
                        {stageMs !== undefined && (
                          <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                            {fmtMs(stageMs)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="max-w-md mx-auto flex items-baseline justify-between px-4 py-3 rounded-lg bg-slate-900 text-white">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Elapsed
                  </span>
                  <span className="text-lg font-mono tabular-nums font-semibold">
                    {fmtMs(elapsedMs)}
                  </span>
                </div>
              </CardBody>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader
                    title="Packaging Images"
                    description="Upload clear photos of all sides containing text."
                  />
                  <CardBody className="space-y-4">
                    <input
                      id="package-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      id="package-camera"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {previewUrls.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {previewUrls.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100 group"
                            >
                              <img
                                src={url}
                                alt={`Package view ${index + 1}`}
                                className="w-full h-32 object-contain bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-2 right-2 bg-slate-900 text-white rounded px-2 py-1 text-xs font-medium hover:bg-slate-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="package-images"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Upload className="w-4 h-4" />
                              Browse Files
                            </label>
                            <label
                              htmlFor="package-camera"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-blue-600" />
                              Take Photo
                            </label>
                          </div>
                          <span className="text-sm text-slate-500">
                            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 sm:p-8 text-center bg-slate-50 flex flex-col items-center justify-center min-h-[200px] space-y-4">
                        <div className="flex items-center justify-center gap-3">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <Camera className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-900">
                            Upload or Capture Package Images
                          </h4>
                          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                            Select local files or use your camera to capture packaging photos.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <label
                            htmlFor="package-images"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm"
                          >
                            <Upload className="w-4 h-4 text-slate-600" />
                            Browse Files
                          </label>
                          <label
                            htmlFor="package-camera"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer shadow-sm"
                          >
                            <Camera className="w-4 h-4" />
                            Take Photo
                          </label>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Inspection Details"
                    description="Enter context for this inspection."
                  />
                  <CardBody className="space-y-4 text-sm">
                    <div>
                      <label className="font-medium text-slate-900 block mb-1">
                        Product / Commodity Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Mustard Oil 1L"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-900 block mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      >
                        <option value="Edible Oils">Edible Oils & Fats</option>
                        <option value="Packaged Food">Packaged Food & Grains</option>
                        <option value="Cosmetics & Toiletries">Cosmetics & Toiletries</option>
                        <option value="Spices & Condiments">Spices & Condiments</option>
                        <option value="General Commodity">General Packaged Commodity</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-slate-900 block mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-900 block mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>
                  </CardBody>
                </Card>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={selectedFiles.length === 0 || isProcessing}
                  icon={<ScanSearch className="w-5 h-5" />}
                >
                  Analyze Compliance
                </Button>
              </div>
            </form>
          )}

          {report && !isProcessing && <InspectionPerfPanel report={report} />}
        </main>
      </div>
    </div>
  );
}