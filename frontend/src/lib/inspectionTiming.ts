/**
 * TEMP DEBUG INSTRUMENTATION — removable.
 *
 * Types + sessionStorage hand-off for the inspection timing view.
 * The browser stopwatch must survive the client-side `router.push` from
 * /inspections/new to /inspections/[id], so the report is parked in
 * sessionStorage and picked up by the result page on mount.
 */

export interface PhaseMark {
  label: string;
  start: number;
  end: number | null;
}

export interface BrowserTiming {
  /** performance.now() at the moment the submit handler started. */
  t0: number;
  phases: PhaseMark[];
  pollCount: number;
  pollWallMs: number;
  firstPollDelayMs: number | null;
  /** Every distinct `currentStage` value the poller actually observed, with elapsed ms. */
  stagesSeen: { stage: string; atMs: number }[];
  /**
   * Every stage the UI transitioned into, including the frontend-only UPLOADING
   * phase that the API never reports. Drives the per-row live timers.
   */
  stageTimeline: { stage: string; atMs: number }[];
  /** Local wall-clock (Date.now) at submit, for cross-referencing logs. */
  submittedAt: number;
}

export interface UploadReport {
  imageCount: number;
  concurrency: string;
  authMs: number;
  multipartParseMs: number;
  productInsertMs: number;
  userLookupMs: number;
  scanInsertMs: number;
  dbInsertsTotalMs: number;
  storagePreprocessWallMs: number;
  preprocessCpuSumMs: number;
  storageCpuSumMs: number;
  handlerEntryAfterRoutingMs: number;
  uploadPhaseTotalMs: number;
}

export interface PipelineReport {
  imageCount: number;
  ocrConcurrency: string;
  stages: Record<string, number | null>;
  ocrImages: {
    imageName: string;
    storageReadMs: number;
    preprocessMs: number;
    ocrExtractorMs: number;
  }[];
  pipelineTotalMs: number;
  uploadToPipelineEndMs: number | null;
}

export interface ResultViewTiming {
  fetchMs: number;
  scanFetchMs: number;
  auditFetchMs: number;
  routePushMs: number | null;
}

export interface InspectionTimingReport {
  scanId: string;
  browser: BrowserTiming;
  backend: {
    upload: UploadReport | null;
    pipeline: PipelineReport | null;
  };
  resultView: ResultViewTiming | null;
  /** Browser-measured submit -> result UI complete. Null until the result page finishes. */
  totalUserMs: number | null;
  /** Wall-clock ms between the upload response and the analyze request being sent. */
  gapUploadToAnalyzeMs: number | null;
}

const KEY = (scanId: string) => `inspection_timing:${scanId}`;

export function saveInspectionTiming(report: InspectionTimingReport) {
  try {
    sessionStorage.setItem(KEY(report.scanId), JSON.stringify(report));
  } catch {
    /* sessionStorage unavailable (private mode / quota) — debug view is best-effort */
  }
}

export function loadInspectionTiming(
  scanId: string,
): InspectionTimingReport | null {
  try {
    const raw = sessionStorage.getItem(KEY(scanId));
    return raw ? (JSON.parse(raw) as InspectionTimingReport) : null;
  } catch {
    return null;
  }
}

export function clearInspectionTiming(scanId: string) {
  try {
    sessionStorage.removeItem(KEY(scanId));
  } catch {
    /* noop */
  }
}

export function fmtMs(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs < 1) return "<1 ms";
  if (abs < 1000) return `${Math.round(abs)} ms`;
  if (abs < 60_000) return `${(abs / 1000).toFixed(2)} s`;
  const m = Math.floor(abs / 60_000);
  const s = ((abs % 60_000) / 1000).toFixed(1);
  return `${m}m ${s}s`;
}

/** Ordered backend stage keys, matching pipeline.service.ts measurement order. */
export const PIPELINE_STAGE_LABELS: [string, string][] = [
  ["pipelineDbFetchMs", "Scan DB fetch"],
  ["statusUpdateToOcrMs", "Status write → OCR"],
  ["ocrMs", "OCR (parallel, all images)"],
  ["statusUpdateToExtractionMs", "Status write → extraction"],
  ["geminiMs", "Gemini extraction"],
  ["statusUpdateToClassificationMs", "Status write → classification"],
  ["classificationMs", "Classification"],
  ["statusUpdateToComplianceMs", "Status write → compliance"],
  ["complianceStageTotalMs", "Compliance stage (total)"],
  ["ragMs", "  ↳ RAG retrieval + embeddings"],
  ["complianceRulesMs", "  ↳ Deterministic rule validators"],
  ["statusUpdateToSavingMs", "Status write → saving"],
  ["databaseWritesMs", "Database writes (final payload)"],
];

export const UPLOAD_STAGE_LABELS: [string, string][] = [
  ["handlerEntryAfterRoutingMs", "Routing → handler entry"],
  ["authMs", "Auth"],
  ["multipartParseMs", "Multipart parse + toBuffer()"],
  ["productInsertMs", "Product insert"],
  ["userLookupMs", "Inspector user lookup"],
  ["scanInsertMs", "Scan insert"],
  ["storagePreprocessWallMs", "Storage + preprocess (wall, parallel)"],
  ["  ↳ preprocessCpuSumMs", "  ↳ preprocess CPU sum (all images)"],
  ["  ↳ storageCpuSumMs", "  ↳ storage CPU sum (all images)"],
];