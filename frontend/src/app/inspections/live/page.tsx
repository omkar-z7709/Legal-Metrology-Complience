"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/api";
import { InspectionPerfPanel } from "@/components/inspection/InspectionPerfPanel";
import {
  BrowserTiming,
  InspectionTimingReport,
  PipelineReport,
  UploadReport,
  saveInspectionTiming,
} from "@/lib/inspectionTiming";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";

type ResultStatus = "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW";
type ScannerPhase =
  | "READY"
  | "WAITING_FOR_CLEAR"
  | "PLACE_PRODUCT"
  | "MOVING"
  | "STABLE"
  | "PROCESSING"
  | "RESULT"
  | "ERROR";
type ResultSource = "AI" | "REFERENCE_BARCODE" | "REFERENCE_VISUAL";

interface DeclarationValue {
  value?: string | number | null;
  confidence?: number;
  source_text?: string;
}

interface ComplianceCheck {
  ruleId?: string;
  fieldName?: string;
  status?: string;
  reason?: string;
  confidence?: number | string;
  evidenceText?: string;
}

interface Violation {
  ruleNumber?: string;
  ruleId?: string;
  title?: string;
  severity?: string;
  reason?: string;
  description?: string;
  extractedEvidence?: string;
}

interface AnalysisResult {
  complianceStatus?: ResultStatus;
  complianceScore?: number;
  classification?: { category?: string; commodityType?: string };
  declarations?: Record<string, DeclarationValue>;
  passedChecks?: ComplianceCheck[];
  reviewChecks?: ComplianceCheck[];
  violations?: Violation[];
}

interface CachedProfile {
  barcode?: string;
  visualSignature?: number[];
  savedAt: string;
  sourceScanId?: string;
  scanNumber?: string;
  result: AnalysisResult;
}

interface LotEvent {
  id: string;
  resultSource: ResultSource;
  status: ResultStatus;
  score: number;
  barcode?: string | null;
  scanId?: string | null;
  scanNumber?: string | null;
  timestamp: string;
}

const REAL_STAGES = [
  ["UPLOADING", "Uploading evidence"],
  ["PREPROCESSING", "Preparing image"],
  ["OCR", "Reading package text"],
  ["EXTRACTION", "Extracting declarations"],
  ["CLASSIFICATION", "Classifying commodity"],
  ["COMPLIANCE", "Running rule + RAG checks"],
  ["SAVING", "Saving inspection record"],
];

const PRODUCT_CACHE_PREFIX = "lm_live_reference_v2:";
const VISUAL_CACHE_KEY = "lm_live_visual_reference_v2";
const VISUAL_MATCH_THRESHOLD = 0.985;
const PRESENCE_THRESHOLD = 0.075;
const CLEAR_THRESHOLD = 0.04;
const MOTION_THRESHOLD = 0.020;
const STABLE_REQUIRED = 4;
const CLEAR_REQUIRED = 3;
const ROLLING_SAMPLE_MS = 220;
const BARCODE_REQUIRED = 2;

function frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (!a.length || a.length !== b.length) return 1;
  let total = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    const ag = a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114;
    const bg = b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114;
    total += Math.abs(ag - bg) / 255;
    count += 1;
  }
  return count ? total / count : 1;
}

function frameSharpness(data: Uint8ClampedArray, width: number, height: number) {
  if (!data.length || width < 3 || height < 3) return 0;
  let total = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const right = idx + 4;
      const down = idx + width * 4;
      const current = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const r = data[right] * 0.299 + data[right + 1] * 0.587 + data[right + 2] * 0.114;
      const d = data[down] * 0.299 + data[down + 1] * 0.587 + data[down + 2] * 0.114;
      total += Math.abs(current - r) + Math.abs(current - d);
      count += 2;
    }
  }
  return count ? total / count : 0;
}

function cacheKey(barcode: string) {
  return `${PRODUCT_CACHE_PREFIX}${barcode}`;
}

function loadBarcodeCache(barcode: string): CachedProfile | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(barcode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    return parsed?.result ? parsed : null;
  } catch {
    return null;
  }
}

function saveBarcodeCache(barcode: string, profile: CachedProfile) {
  try {
    sessionStorage.setItem(cacheKey(barcode), JSON.stringify(profile));
  } catch {
    // Optimization only.
  }
}

function loadVisualCache() {
  try {
    const raw = sessionStorage.getItem(VISUAL_CACHE_KEY);
    if (!raw) return [] as CachedProfile[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedProfile[]) : [];
  } catch {
    return [] as CachedProfile[];
  }
}

function saveVisualCache(profile: CachedProfile) {
  try {
    const entries = loadVisualCache();
    const filtered = entries.filter((entry) => entry.sourceScanId !== profile.sourceScanId);
    sessionStorage.setItem(
      VISUAL_CACHE_KEY,
      JSON.stringify([profile, ...filtered].slice(0, 50)),
    );
  } catch {
    // Optimization only.
  }
}

function visualSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
  return 1 - total / (a.length * 255);
}

function signatureFromFrame(data: Uint8ClampedArray, width: number, height: number) {
  const columns = 24;
  const rows = 32;
  const signature: number[] = [];
  for (let y = 0; y < rows; y += 1) {
    const sy = Math.min(height - 1, Math.floor((y / rows) * height));
    for (let x = 0; x < columns; x += 1) {
      const sx = Math.min(width - 1, Math.floor((x / columns) * width));
      const idx = (sy * width + sx) * 4;
      const gray = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
      signature.push(gray);
    }
  }
  return signature;
}

function resultStatus(result: AnalysisResult | null): ResultStatus {
  return result?.complianceStatus || "REQUIRES_REVIEW";
}

function numberValue(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function displayDeclaration(result: AnalysisResult | null, key: string, fallback = "—") {
  const item = result?.declarations?.[key];
  return item?.value === null || item?.value === undefined || item?.value === "" ? fallback : String(item.value);
}

export default function LiveInspectionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const barcodeCandidateRef = useRef<string | null>(null);
  const barcodeStableRef = useRef(0);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const baselineFrameRef = useRef<Uint8ClampedArray | null>(null);
  const stableFramesRef = useRef(0);
  const clearFramesRef = useRef(0);
  const captureLockRef = useRef(false);
  const mountedRef = useRef(true);
  const currentBarcodeRef = useRef<string | null>(null);
  const autoCaptureRef = useRef(true);
  const scannerActiveRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [phase, setPhase] = useState<ScannerPhase>("READY");
  const [activeStage, setActiveStage] = useState("UPLOADING");
  const [error, setError] = useState<string | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentSource, setCurrentSource] = useState<ResultSource | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [progress, setProgress] = useState({ scanned: 0, compliant: 0, nonCompliant: 0, review: 0, referenceMatches: 0, aiAnalyses: 0 });
  const [events, setEvents] = useState<LotEvent[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [clearGate, setClearGate] = useState(false);
  const [cameraFps, setCameraFps] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  // TEMP DEBUG INSTRUMENTATION — the live scanner emits the same
  // InspectionTimingReport shape as /inspections/new so one perf panel and one
  // sessionStorage hand-off key serve both capture paths.
  const [perfReport, setPerfReport] = useState<InspectionTimingReport | null>(null);

  const elapsedSeconds = startedAt ? Math.max(0, Math.round((nowTick - startedAt) / 1000)) : 0;
  const averageSeconds = progress.scanned ? (elapsedSeconds / progress.scanned).toFixed(1) : "—";
  const hasReference = currentSource === "REFERENCE_BARCODE" || currentSource === "REFERENCE_VISUAL";

  useEffect(() => {
    mountedRef.current = true;
    const tick = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    autoCaptureRef.current = autoCapture;
  }, [autoCapture]);

  const stopRollingDetector = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    scannerActiveRef.current = false;
    barcodeCandidateRef.current = null;
    barcodeStableRef.current = 0;
    stableFramesRef.current = 0;
  }, []);

  const stopCamera = useCallback(() => {
    stopRollingDetector();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) {
      setCameraOn(false);
      setPhase("READY");
    }
  }, [stopRollingDetector]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePreview = useCallback((canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    setLastFrameUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return dataUrl;
    });
    return dataUrl;
  }, []);

  const getReferenceFromFrame = useCallback((signature: number[], barcode?: string | null) => {
    if (barcode) {
      const cached = loadBarcodeCache(barcode);
      if (cached) return { source: "REFERENCE_BARCODE" as ResultSource, profile: cached };
    }
    const visualEntries = loadVisualCache();
    let best: { profile: CachedProfile; similarity: number } | null = null;
    for (const entry of visualEntries) {
      if (!entry.visualSignature) continue;
      const similarity = visualSimilarity(signature, entry.visualSignature);
      if (!best || similarity > best.similarity) best = { profile: entry, similarity };
    }
    if (best && best.similarity >= VISUAL_MATCH_THRESHOLD) {
      return { source: "REFERENCE_VISUAL" as ResultSource, profile: best.profile };
    }
    return null;
  }, []);

  const registerResult = useCallback((finalResult: AnalysisResult, source: ResultSource, scanId: string | null, scanNumber?: string | null, barcode?: string | null) => {
    const status = resultStatus(finalResult);
    setCurrentResult(finalResult);
    setCurrentSource(source);
    setPhase("RESULT");
    setActiveStage("COMPLETED");
    setProgress((previous) => ({
      scanned: previous.scanned + 1,
      compliant: previous.compliant + (status === "COMPLIANT" ? 1 : 0),
      nonCompliant: previous.nonCompliant + (status === "NON_COMPLIANT" ? 1 : 0),
      review: previous.review + (status === "REQUIRES_REVIEW" ? 1 : 0),
      referenceMatches: previous.referenceMatches + (source !== "AI" ? 1 : 0),
      aiAnalyses: previous.aiAnalyses + (source === "AI" ? 1 : 0),
    }));
    setEvents((previous) => [
      {
        id: `${Date.now()}-${previous.length}`,
        resultSource: source,
        status,
        score: numberValue(finalResult.complianceScore),
        barcode,
        scanId,
        scanNumber,
        timestamp: new Date().toISOString(),
      },
      ...previous,
    ].slice(0, 30));
  }, []);

  const captureCurrentFrame = useCallback(async (barcodeOverride?: string | null, trigger: "AUTO" | "MANUAL" = "AUTO") => {
    if (captureLockRef.current || !videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    captureLockRef.current = true;
    stopRollingDetector();
    setPhase("PROCESSING");
    setError(null);

    // TEMP DEBUG INSTRUMENTATION — stopwatch starts when the trigger is accepted,
    // so it covers camera encode + upload + poll + analyze + result fetch.
    const t0 = performance.now();
    const timing: BrowserTiming = {
      t0,
      phases: [],
      pollCount: 0,
      pollWallMs: 0,
      firstPollDelayMs: null,
      stagesSeen: [],
      stageTimeline: [{ stage: "CAPTURING", atMs: 0 }],
      submittedAt: Date.now(),
    };
    const markPhase = (label: string, start: number, end: number) => {
      timing.phases.push({ label, start, end });
    };
    let uploadTiming: UploadReport | null = null;
    let pipelineTiming: PipelineReport | null = null;
    let gapUploadToAnalyzeMs: number | null = null;
    let timingScanId: string | null = null;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Camera capture context is unavailable.");
      const drawStart = performance.now();
      ctx.drawImage(video, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const signature = signatureFromFrame(imageData.data, width, height);
      const barcode = barcodeOverride || currentBarcodeRef.current;
      capturePreview(canvas);
      markPhase(`Draw frame + local motion analysis (${width}x${height})`, drawStart, performance.now());

      const reference = getReferenceFromFrame(signature, barcode);
      if (reference) {
        // Reference-cache hit: no upload, no analysis, so there is nothing to time
        // against the backend. Discard any stale report from the previous product.
        setPerfReport(null);
        setCurrentScanId(reference.profile.sourceScanId || null);
        registerResult(
          reference.profile.result,
          reference.source,
          reference.profile.sourceScanId || null,
          reference.profile.scanNumber || null,
          barcode || reference.profile.barcode || null,
        );
        return;
      }

      const encodeStart = performance.now();
      const file = await new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Could not encode the captured frame."));
          resolve(new File([blob], `live-product-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }, "image/jpeg", 0.9);
      });
      markPhase("canvas.toBlob → File", encodeStart, performance.now());

      const token = localStorage.getItem("lm_auth_token") || "dev-inspector";
      const formDataStart = performance.now();
      const formData = new FormData();
      formData.append("files", file);
      formData.append("productName", "Live Camera Product");
      formData.append("category", "General Commodity");
      formData.append("brand", "");
      formData.append("location", "Live Lot Inspection");
      formData.append("scanMode", "LIVE_ROLLING");
      formData.append("captureTrigger", trigger);
      if (barcode) formData.append("barcode", barcode);
      markPhase("Build FormData", formDataStart, performance.now());

      timing.stageTimeline.push({ stage: "UPLOADING", atMs: performance.now() - t0 });
      const uploadStart = performance.now();
      const uploadRes = await fetch(`${API_BASE_URL}/api/scans/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadHeadersAt = performance.now();
      const uploadJson = await uploadRes.json().catch(() => null);
      const uploadParsedAt = performance.now();
      markPhase("POST /scans/upload (request → response headers)", uploadStart, uploadHeadersAt);
      markPhase("Parse upload JSON", uploadHeadersAt, uploadParsedAt);
      if (!uploadRes.ok || !uploadJson?.data?.scanId) {
        throw new Error(uploadJson?.error?.message || `Package upload failed with HTTP ${uploadRes.status}.`);
      }
      const scanId = String(uploadJson.data.scanId);
      timingScanId = scanId;
      setCurrentScanId(scanId);
      uploadTiming = uploadJson.data.timing ?? null;

      const pollScheduleStart = performance.now();
      let polling = true;
      const poll = async () => {
        if (!polling) return;
        const pollStart = performance.now();
        try {
          if (timing.firstPollDelayMs === null) {
            timing.firstPollDelayMs = pollStart - t0;
          }
          const pollRes = await fetch(`${API_BASE_URL}/api/scans/${scanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pollJson = await pollRes.json().catch(() => null);
          timing.pollCount += 1;
          const stage = pollJson?.data?.scan?.currentStage as string | undefined;
          if (stage) {
            if (mountedRef.current) setActiveStage(stage);
            const atMs = performance.now() - t0;
            const lastSeen = timing.stagesSeen[timing.stagesSeen.length - 1];
            if (!lastSeen || lastSeen.stage !== stage) {
              timing.stagesSeen.push({ stage, atMs });
              timing.stageTimeline.push({ stage, atMs });
            }
          }
        } catch {
          // The analyze request below remains the source of truth.
        }
        timing.pollWallMs += performance.now() - pollStart;
        if (polling && mountedRef.current) window.setTimeout(poll, 600);
      };
      window.setTimeout(poll, 250);

      gapUploadToAnalyzeMs = performance.now() - pollScheduleStart;
      const analyzeStart = performance.now();
      const analyzeRes = await fetch(`${API_BASE_URL}/api/inspections/${scanId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const analyzeHeadersAt = performance.now();
      const analyzeJson = await analyzeRes.json().catch(() => null);
      const analyzeParsedAt = performance.now();
      polling = false;
      markPhase("POST /inspections/:id/analyze (request → headers)", analyzeStart, analyzeHeadersAt);
      markPhase("Parse analyze JSON", analyzeHeadersAt, analyzeParsedAt);
      pipelineTiming = analyzeJson?.timing ?? null;
      if (!analyzeRes.ok || !analyzeJson?.success) {
        throw new Error(analyzeJson?.error?.message || "Inspection analysis failed.");
      }

      const detailStart = performance.now();
      const detailRes = await fetch(`${API_BASE_URL}/api/scans/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailJson = await detailRes.json().catch(() => null);
      markPhase("GET /scans/:id (fetch analysis result)", detailStart, performance.now());
      const analysis = (detailJson?.data?.analysis || analyzeJson?.data) as AnalysisResult | undefined;
      const finalResult: AnalysisResult = analysis || { complianceStatus: "REQUIRES_REVIEW", complianceScore: 0 };
      const scanNumber = detailJson?.data?.scan?.scanNumber || uploadJson?.data?.scanNumber || null;

      // Close the stopwatch: the result is now in hand, so this is the true
      // user-perceived capture → answer latency for a camera inspection.
      timing.stageTimeline.push({ stage: "COMPLETED", atMs: performance.now() - t0 });
      const report: InspectionTimingReport = {
        scanId,
        browser: timing,
        backend: { upload: uploadTiming, pipeline: pipelineTiming },
        resultView: {
          fetchMs: performance.now() - t0,
          scanFetchMs: performance.now() - detailStart,
          auditFetchMs: 0,
          routePushMs: null,
        },
        totalUserMs: performance.now() - t0,
        gapUploadToAnalyzeMs,
      };
      setPerfReport(report);
      saveInspectionTiming(report);
      if (barcode) {
        const profile: CachedProfile = {
          barcode,
          visualSignature: signature,
          savedAt: new Date().toISOString(),
          sourceScanId: scanId,
          scanNumber,
          result: finalResult,
        };
        saveBarcodeCache(barcode, profile);
        saveVisualCache(profile);
      } else {
        saveVisualCache({
          visualSignature: signature,
          savedAt: new Date().toISOString(),
          sourceScanId: scanId,
          scanNumber,
          result: finalResult,
        });
      }

      registerResult(finalResult, "AI", scanId, scanNumber, barcode);
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || "Live inspection failed.");
        setPhase("ERROR");
      }
      // Keep whatever was measured before the failure. Without this a camera run
      // that dies mid-analysis would leave no trace of where the time went.
      if (timingScanId) {
        const partial: InspectionTimingReport = {
          scanId: timingScanId,
          browser: timing,
          backend: { upload: uploadTiming, pipeline: pipelineTiming },
          resultView: null,
          totalUserMs: performance.now() - t0,
          gapUploadToAnalyzeMs,
        };
        setPerfReport(partial);
        saveInspectionTiming(partial);
      }
    } finally {
      captureLockRef.current = false;
    }
  }, [capturePreview, getReferenceFromFrame, registerResult, stopRollingDetector]);

  const startRollingDetector = useCallback(() => {
    if (!autoCaptureRef.current || !cameraOn || currentResult || captureLockRef.current) return;
    if (intervalRef.current !== null) return;
    scannerActiveRef.current = true;

    intervalRef.current = window.setInterval(async () => {
      if (!scannerActiveRef.current || !autoCaptureRef.current || captureLockRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      try {
        const targetW = 96;
        const targetH = 72;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, targetW, targetH);
        const data = ctx.getImageData(0, 0, targetW, targetH).data;
        const current = new Uint8ClampedArray(data);
        setCameraFps((fps) => Math.min(30, fps * 0.7 + 1000 / ROLLING_SAMPLE_MS * 0.3));

        if (!baselineFrameRef.current) {
          baselineFrameRef.current = current;
          previousFrameRef.current = current;
          if (mountedRef.current) setPhase("WAITING_FOR_CLEAR");
          return;
        }

        const sceneChange = frameDiff(current, baselineFrameRef.current);
        const motion = previousFrameRef.current ? frameDiff(current, previousFrameRef.current) : 1;
        const sharpness = frameSharpness(current, targetW, targetH);
        previousFrameRef.current = current;

        if (sceneChange <= CLEAR_THRESHOLD) {
          clearFramesRef.current += 1;
          stableFramesRef.current = 0;
          if (mountedRef.current) {
            setClearGate(true);
            setPhase("PLACE_PRODUCT");
          }
        } else {
          setClearGate(false);
          if (clearFramesRef.current >= CLEAR_REQUIRED && mountedRef.current) setPhase("PLACE_PRODUCT");

          if (sceneChange > PRESENCE_THRESHOLD) {
            if (motion < MOTION_THRESHOLD && sharpness > 6) {
              stableFramesRef.current += 1;
              if (mountedRef.current) setPhase("STABLE");
            } else {
              stableFramesRef.current = 0;
              if (mountedRef.current) setPhase("MOVING");
            }

            if (stableFramesRef.current >= STABLE_REQUIRED && clearFramesRef.current >= CLEAR_REQUIRED) {
              stableFramesRef.current = 0;
              clearFramesRef.current = 0;
              const barcode = currentBarcodeRef.current;
              void captureCurrentFrame(barcode, "AUTO");
            }
          } else {
            stableFramesRef.current = 0;
            if (mountedRef.current) setPhase("PLACE_PRODUCT");
          }
        }
      } catch {
        // Camera analysis is best-effort; manual capture remains available.
      }
    }, ROLLING_SAMPLE_MS);
  }, [cameraOn, captureCurrentFrame, currentResult]);

  useEffect(() => {
    if (!cameraOn || !autoCapture || currentResult) {
      stopRollingDetector();
      return;
    }
    const timer = window.setTimeout(startRollingDetector, 250);
    return () => window.clearTimeout(timer);
  }, [autoCapture, cameraOn, currentResult, startRollingDetector, stopRollingDetector]);

  const startCamera = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Camera preview is unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      barcodeDetectorRef.current = null;
      currentBarcodeRef.current = null;
      barcodeCandidateRef.current = null;
      barcodeStableRef.current = 0;
      previousFrameRef.current = null;
      baselineFrameRef.current = null;
      stableFramesRef.current = 0;
      clearFramesRef.current = CLEAR_REQUIRED;
      captureLockRef.current = false;
      setDetectedBarcode(null);
      setCurrentResult(null);
      setCurrentSource(null);
      setCurrentScanId(null);
      setError(null);
      setClearGate(true);
      setCameraOn(true);
      setPhase("WAITING_FOR_CLEAR");
      if (!startedAt) setStartedAt(Date.now());
    } catch (err: any) {
      setError(err?.message || "Unable to start camera. Check browser camera permissions.");
      setPhase("ERROR");
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!cameraOn || !autoCapture) return;
    const id = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      try {
        if (!barcodeDetectorRef.current && (window as any).BarcodeDetector) {
          barcodeDetectorRef.current = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "qr_code", "data_matrix"],
          });
        }
        if (!barcodeDetectorRef.current) return;
        const detected = await barcodeDetectorRef.current.detect(video);
        const value = detected?.find((item: any) => item?.rawValue)?.rawValue as string | undefined;
        if (!value) {
          barcodeCandidateRef.current = null;
          barcodeStableRef.current = 0;
          if (mountedRef.current) setDetectedBarcode(null);
          return;
        }
        if (barcodeCandidateRef.current === value) barcodeStableRef.current += 1;
        else {
          barcodeCandidateRef.current = value;
          barcodeStableRef.current = 1;
        }
        currentBarcodeRef.current = value;
        if (mountedRef.current) setDetectedBarcode(value);

        if (barcodeStableRef.current >= BARCODE_REQUIRED && clearFramesRef.current >= CLEAR_REQUIRED) {
          const cached = loadBarcodeCache(value);
          if (cached && !captureLockRef.current && !currentResult) {
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx && video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                capturePreview(canvas);
              }
            }
            captureLockRef.current = true;
            stopRollingDetector();
            registerResult(cached.result, "REFERENCE_BARCODE", cached.sourceScanId || null, cached.scanNumber || null, value);
            captureLockRef.current = false;
          }
        }
      } catch {
        // Native BarcodeDetector is optional.
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [autoCapture, cameraOn, capturePreview, currentResult, registerResult, stopRollingDetector]);

  const nextProduct = () => {
    if (!cameraOn) {
      void startCamera();
      return;
    }
    setCurrentResult(null);
    setCurrentSource(null);
    setCurrentScanId(null);
    setError(null);
    setActiveStage("UPLOADING");
    setDetectedBarcode(null);
    currentBarcodeRef.current = null;
    barcodeCandidateRef.current = null;
    barcodeStableRef.current = 0;
    stableFramesRef.current = 0;
    clearFramesRef.current = 0;
    captureLockRef.current = false;
    baselineFrameRef.current = null;
    previousFrameRef.current = null;
    setClearGate(false);
    setPhase("WAITING_FOR_CLEAR");
    if (lastFrameUrl?.startsWith("blob:")) URL.revokeObjectURL(lastFrameUrl);
    setLastFrameUrl(null);
  };

  const resetLot = () => {
    setProgress({ scanned: 0, compliant: 0, nonCompliant: 0, review: 0, referenceMatches: 0, aiAnalyses: 0 });
    setEvents([]);
    setStartedAt(cameraOn ? Date.now() : null);
    nextProduct();
  };

  const status = resultStatus(currentResult);
  const statusMeta = useMemo(() => {
    if (status === "COMPLIANT") return { label: "COMPLIANT", icon: CheckCircle2, classes: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (status === "NON_COMPLIANT") return { label: "NON-COMPLIANT", icon: XCircle, classes: "bg-red-50 text-red-700 border-red-200" };
    return { label: "REQUIRES REVIEW", icon: AlertTriangle, classes: "bg-amber-50 text-amber-700 border-amber-200" };
  }, [status]);
  const StatusIcon = statusMeta.icon;

  const phaseCopy: Record<ScannerPhase, string> = {
    READY: "Start camera to begin the rolling inspection lane.",
    WAITING_FOR_CLEAR: "Clear the scan lane before presenting the next package.",
    PLACE_PRODUCT: "Place the package inside the frame.",
    MOVING: "Package detected — keep it steady.",
    STABLE: "Package is stable — capturing automatically.",
    PROCESSING: "Evidence captured — running inspection pipeline.",
    RESULT: hasReference ? "Reference match — expensive AI rerun avoided." : "Inspection complete — review or continue.",
    ERROR: "Scanner needs attention. Fix the issue or use manual capture.",
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Inspections", href: "/inspections" }, { label: "Live Lot Inspection" }]} />
        <main className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">Continuous Live Lot Inspection</h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Keep the camera rolling. Present one package at a time, let the system capture it automatically, then press <strong>Next Product</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/inspections/new" className="text-xs font-semibold text-slate-600 hover:text-[#12304A] px-3 py-2 rounded-lg hover:bg-white">
                Standard upload
              </Link>
              <button onClick={resetLot} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                <RefreshCw className="w-3.5 h-3.5" /> Reset lot
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <Card className="xl:col-span-8 overflow-hidden">
              <CardHeader
                title="Rolling Camera Scanner"
                description="The scanner first checks for a clear lane, then waits for a stable package before taking one evidence frame."
                action={
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${cameraOn ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    {cameraOn ? "Camera live" : "Camera off"}
                  </div>
                }
              />
              <CardBody className="space-y-4">
                <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                  {!cameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                      <div className="space-y-3">
                        <div className="mx-auto w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center">
                          <Camera className="w-7 h-7" />
                        </div>
                        <div className="text-white font-semibold">Camera is ready</div>
                        <p className="text-xs text-slate-300 max-w-md">Start the camera once. From there, the rolling lane handles capture → analysis → result → Next Product without restarting the camera.</p>
                      </div>
                    </div>
                  )}

                  {cameraOn && !currentResult && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-[66%] h-[72%] border-2 border-white/80 rounded-2xl shadow-[0_0_0_999px_rgba(2,6,23,0.28)] overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)] animate-[scan-sweep_2.1s_ease-in-out_infinite]" />
                        </div>
                      </div>
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/75 text-white text-[10px] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {phaseCopy[phase]}
                      </div>
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-slate-950/75 text-white text-[10px] font-semibold">
                        Rolling samples: {cameraFps.toFixed(1)}/s
                      </div>
                      {detectedBarcode && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-blue-600/90 text-white text-[10px] font-semibold">
                          Barcode {detectedBarcode}
                        </div>
                      )}
                    </div>
                  )}

                  {phase === "PROCESSING" && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                      <div className="bg-white rounded-2xl p-5 w-[min(92%,380px)] shadow-xl text-center space-y-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                        <div className="font-bold text-[#12304A]">Analyzing package</div>
                        <div className="text-[11px] text-slate-500">{activeStage === "COMPLETED" ? "Finalizing result" : activeStage}</div>
                      </div>
                    </div>
                  )}

                  {currentResult && lastFrameUrl && (
                    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                      <img src={lastFrameUrl} alt="Captured package evidence" className="w-full h-full object-contain" />
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-slate-950/80 text-white text-[10px] font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {hasReference ? "Reference match" : "Captured evidence"}
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!cameraOn ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={isStarting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#12304A] text-white text-xs font-semibold hover:bg-[#1a4268] disabled:opacity-50"
                      >
                        {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        {isStarting ? "Starting..." : "Start Rolling Camera"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        disabled={phase === "PROCESSING"}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        <CameraOff className="w-4 h-4" /> Stop Camera
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setAutoCapture((value) => !value)}
                      disabled={!cameraOn || phase === "PROCESSING"}
                      className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold disabled:opacity-50 ${autoCapture ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-300 text-slate-600"}`}
                    >
                      {autoCapture ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      Auto scan {autoCapture ? "ON" : "OFF"}
                    </button>
                  </div>

                  {cameraOn && !currentResult && phase !== "PROCESSING" && (
                    <button
                      type="button"
                      onClick={() => void captureCurrentFrame(currentBarcodeRef.current, "MANUAL")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                    >
                      Capture Now <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {currentResult && (
                    <div className="flex items-center gap-2">
                      {currentScanId && (
                        <Link
                          href={`/inspections/${currentScanId}`}
                          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                          Review <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={nextProduct}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#12304A] text-white text-xs font-semibold hover:bg-[#1a4268]"
                      >
                        Next Product <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {cameraOn && !currentResult && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className={`rounded-lg border p-3 ${clearGate ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                      <div className="font-semibold text-slate-800">1. Clear lane</div>
                      <div className="text-slate-500 mt-1">{clearGate ? "Ready for a new package" : "Move the previous package away"}</div>
                    </div>
                    <div className={`rounded-lg border p-3 ${phase === "STABLE" ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="font-semibold text-slate-800">2. Stable package</div>
                      <div className="text-slate-500 mt-1">{phase === "STABLE" ? "Capture threshold reached" : "Motion is being filtered locally"}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <div className="font-semibold text-slate-800">3. Fast path</div>
                      <div className="text-slate-500 mt-1">Barcode/reference match can skip expensive reruns</div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            <div className="xl:col-span-4 space-y-6">
              <Card>
                <CardHeader title="Current Result" description={currentResult ? (hasReference ? "Reference match from this live session" : "Fresh AI-assisted inspection") : "Awaiting next package"} />
                <CardBody>
                  {!currentResult ? (
                    <div className="py-10 text-center text-slate-400">
                      <ScanLine className="w-9 h-9 mx-auto mb-3" />
                      <div className="text-sm font-semibold text-slate-600">No package result yet</div>
                      <div className="text-xs mt-1">The next stable package will appear here.</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusMeta.classes}`}>
                        <StatusIcon className="w-6 h-6" />
                        <div className="flex-1">
                          <div className="text-[10px] uppercase tracking-wider font-bold">Result</div>
                          <div className="text-lg font-black">{statusMeta.label}</div>
                        </div>
                        <div className="text-2xl font-black">{numberValue(currentResult.complianceScore)}%</div>
                      </div>

                      {hasReference && (
                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex gap-2">
                          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>This product matched a reference already analyzed during this live lot. The expensive OCR/Gemini/RAG path was avoided.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 uppercase tracking-wide text-[9px]">Product</div><div className="font-semibold text-slate-800 mt-1">{displayDeclaration(currentResult, "generic_name", "Live product")}</div></div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 uppercase tracking-wide text-[9px]">Category</div><div className="font-semibold text-slate-800 mt-1">{currentResult.classification?.category || "—"}</div></div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 uppercase tracking-wide text-[9px]">MRP</div><div className="font-semibold text-slate-800 mt-1">{displayDeclaration(currentResult, "mrp")}</div></div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 uppercase tracking-wide text-[9px]">Net quantity</div><div className="font-semibold text-slate-800 mt-1">{displayDeclaration(currentResult, "net_quantity")}</div></div>
                      </div>

                      {!!currentResult.violations?.length && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs">
                          <div className="font-semibold text-red-800 mb-1">Violations detected</div>
                          <div className="space-y-1 text-red-700">{currentResult.violations.slice(0, 3).map((v, i) => <div key={i}>• {v.title || v.reason || v.description || "Compliance violation"}</div>)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Lot Progress" description="Current rolling inspection session" />
                <CardBody>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Scanned</div><div className="text-2xl font-bold text-[#12304A] mt-1">{progress.scanned}</div></div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">Compliant</div><div className="text-2xl font-bold text-emerald-700 mt-1">{progress.compliant}</div></div>
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-red-700">Violations</div><div className="text-2xl font-bold text-red-700 mt-1">{progress.nonCompliant}</div></div>
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-amber-700">Review</div><div className="text-2xl font-bold text-amber-700 mt-1">{progress.review}</div></div>
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-blue-700">Reference matches</div><div className="text-2xl font-bold text-blue-700 mt-1">{progress.referenceMatches}</div></div>
                    <div className="rounded-xl bg-violet-50 border border-violet-200 p-3"><div className="text-[10px] uppercase tracking-wider font-semibold text-violet-700">AI analyses</div><div className="text-2xl font-bold text-violet-700 mt-1">{progress.aiAnalyses}</div></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-2"><Clock3 className="w-4 h-4 text-slate-400" /><div><div className="text-slate-400">Elapsed</div><div className="font-bold text-slate-700">{elapsedSeconds}s</div></div></div>
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-2"><ScanLine className="w-4 h-4 text-slate-400" /><div><div className="text-slate-400">Avg / product</div><div className="font-bold text-slate-700">{averageSeconds}s</div></div></div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader title="Rolling Inspection Log" description="Latest products scanned in this live lot" />
            <CardBody>
              {events.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-6">No products scanned yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]"><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Barcode</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Score</th><th className="py-2">Inspection</th></tr></thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-3 text-slate-500">{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                          <td className="py-3 pr-3"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${event.resultSource === "AI" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{event.resultSource === "AI" ? "AI" : "REFERENCE"}</span></td>
                          <td className="py-3 pr-3 font-mono text-slate-600">{event.barcode || "—"}</td>
                          <td className="py-3 pr-3"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${event.status === "COMPLIANT" ? "bg-emerald-50 text-emerald-700" : event.status === "NON_COMPLIANT" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{event.status}</span></td>
                          <td className="py-3 pr-3 font-semibold text-slate-700">{event.score}%</td>
                          <td className="py-3">{event.scanId ? <Link href={`/inspections/${event.scanId}`} className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></Link> : <span className="text-slate-400">Reference only</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-200 pt-4">
            <strong>Operational note:</strong> reference matches are a speed optimization inside the current browser session. A fresh AI-assisted analysis is performed for a new product or a product that does not match the cached barcode/visual reference. Final legal determination remains with the authorized inspector.
          </div>
          {/* TEMP DEBUG INSTRUMENTATION — same panel the browse flow uses. */}
          {perfReport && <InspectionPerfPanel report={perfReport} />}
        </main>
      </div>
      <style jsx global>{`
        @keyframes scan-sweep {
          0%, 100% { transform: translateY(0); opacity: .35; }
          50% { transform: translateY(24rem); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
