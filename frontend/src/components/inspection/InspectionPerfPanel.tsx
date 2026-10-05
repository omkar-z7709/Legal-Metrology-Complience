"use client";

/**
 * TEMP DEBUG INSTRUMENTATION — removable.
 *
 * Renders the backend/frontend timing breakdown for one inspection run.
 * Every number shown here is a real measurement; nothing is simulated.
 */

import React from "react";
import {
  InspectionTimingReport,
  PipelineReport,
  UploadReport,
  fmtMs,
  PIPELINE_STAGE_LABELS,
  UPLOAD_STAGE_LABELS,
} from "@/lib/inspectionTiming";

function Row({
  label,
  value,
  indent = false,
  strong = false,
}: {
  label: string;
  value: number | null | undefined;
  indent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1 ${
        indent ? "pl-4" : ""
      } ${strong ? "font-semibold" : ""}`}
    >
      <span className="text-[13px] text-slate-600">{label}</span>
      <span className="text-[13px] tabular-nums font-mono text-slate-900 whitespace-nowrap">
        {fmtMs(value)}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </h5>
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-md px-3 py-1 bg-slate-50/50">
        {children}
      </div>
    </div>
  );
}

function UploadBreakdown({ upload }: { upload: UploadReport }) {
  return (
    <Section
      title={`Upload phase — backend (${upload.imageCount} image${
        upload.imageCount === 1 ? "" : "s"
      }, ${upload.concurrency})`}
    >
      {UPLOAD_STAGE_LABELS.map(([key, label]) => (
        <Row
          key={key}
          label={label}
          value={(upload as unknown as Record<string, number>)[key]}
          indent={key.startsWith("  ")}
        />
      ))}
      <Row label="Upload phase total" value={upload.uploadPhaseTotalMs} strong />
    </Section>
  );
}

function PipelineBreakdown({ pipeline }: { pipeline: PipelineReport }) {
  return (
    <>
      <Section
        title={`Analysis pipeline — backend (${pipeline.imageCount} image${
          pipeline.imageCount === 1 ? "" : "s"
        }, OCR ${pipeline.ocrConcurrency})`}
      >
        {PIPELINE_STAGE_LABELS.map(([key, label]) => (
          <Row
            key={key}
            label={label}
            value={pipeline.stages[key]}
            indent={key === "ragMs" || key === "complianceRulesMs"}
          />
        ))}
        <Row label="Pipeline total (processScan)" value={pipeline.pipelineTotalMs} strong />
        <Row
          label="Upload start → pipeline end"
          value={pipeline.uploadToPipelineEndMs}
          strong
        />
      </Section>

      {pipeline.ocrImages.length > 0 && (
        <Section title="OCR per image (parallel)" >
          <div className="py-1">
            {pipeline.ocrImages.map((img, i) => (
              <div key={i} className="py-1">
                <div className="text-[13px] text-slate-700 font-medium truncate">
                  {img.imageName}
                </div>
                <div className="pl-4">
                  <Row label="Storage read" value={img.storageReadMs} indent />
                  <Row label="Preprocess" value={img.preprocessMs} indent />
                  <Row
                    label="OCR extractor (Google Vision / fallback)"
                    value={img.ocrExtractorMs}
                    indent
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

export function InspectionPerfPanel({
  report,
  defaultOpen = false,
}: {
  report: InspectionTimingReport | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (!report) return null;

  const { browser, backend, resultView, totalUserMs, gapUploadToAnalyzeMs } =
    report;

  const browserTotal = totalUserMs ?? -1;
  const accountedFor =
    (backend.upload?.uploadPhaseTotalMs ?? 0) +
    (backend.pipeline?.pipelineTotalMs ?? 0) +
    (resultView?.fetchMs ?? 0);
  const unaccounted = totalUserMs !== null ? browserTotal - accountedFor : null;

  return (
    <div className="mt-6 border border-amber-300 bg-amber-50/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-amber-100/60 transition-colors"
      >
        <span className="flex items-baseline gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Performance details
          </span>
          <span className="text-[13px] text-slate-600">
            Total user time{" "}
            <span className="font-mono font-semibold text-slate-900">
              {fmtMs(totalUserMs)}
            </span>
          </span>
        </span>
        <span className="text-slate-400 text-xs">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-amber-200">
          <Section title="Frontend — measured in the browser">
            <Row label="Submit clicked → result UI complete" value={totalUserMs} strong />
            <Row
              label="Gap: upload response → analyze request sent"
              value={gapUploadToAnalyzeMs}
            />
            {browser.phases.map((p) => (
              <Row
                key={p.label}
                label={p.label}
                value={p.end !== null ? p.end - p.start : null}
              />
            ))}
            <Row
              label={`Status polls (${browser.pollCount} requests, wall time)`}
              value={browser.pollWallMs}
            />
            <Row label="Delay before first poll fired" value={browser.firstPollDelayMs} />
            {resultView && (
              <>
                <Row label="Result page: scan + audit fetch" value={resultView.fetchMs} />
                <Row label="Result page: scan fetch" value={resultView.scanFetchMs} />
                <Row label="Result page: audit fetch" value={resultView.auditFetchMs} />
              </>
            )}
            <Row
              label="Unaccounted (network, parsing, render, handoff)"
              value={unaccounted}
              strong
            />
          </Section>

          {backend.upload && <UploadBreakdown upload={backend.upload} />}
          {backend.pipeline ? (
            <PipelineBreakdown pipeline={backend.pipeline} />
          ) : (
            <p className="text-[13px] text-slate-500">
              No pipeline report captured for this run.
            </p>
          )}

          {browser.stagesSeen.length > 0 && (
            <Section title="Stages observed by the poller (as actually reported by the API)">
              {browser.stagesSeen.map((s, i) => (
                <div
                  key={`${s.stage}-${i}`}
                  className="flex items-baseline justify-between gap-4 py-1"
                >
                  <span className="text-[13px] text-slate-600 font-mono">
                    {s.stage}
                  </span>
                  <span className="text-[13px] tabular-nums font-mono text-slate-900">
                    +{fmtMs(s.atMs)}
                  </span>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}