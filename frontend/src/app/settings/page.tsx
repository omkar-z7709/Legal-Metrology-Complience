"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Settings, Sliders, ShieldCheck, Database, Cpu, Save } from "lucide-react";

export default function SettingsPage() {
  const [ocrEngine, setOcrEngine] = useState("google-vision");
  const [geminiModel, setGeminiModel] = useState("gemini-3.7-flash");
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.85");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "System Setup" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Configuration</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Engine Settings
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Configure OCR providers, language models, and regulatory threshold parameters.
              </p>
            </div>
          </header>

          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader
                title="Vision & Extraction Pipeline"
                description="Select default OCR service and generative structured declaration parser"
              />
              <CardBody className="space-y-4 text-sm">
                <div>
                  <label className="mb-1 block font-semibold text-slate-800">Primary OCR Service</label>
                  <select
                    value={ocrEngine}
                    onChange={(e) => setOcrEngine(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
                  >
                    <option value="google-vision">Google Cloud Vision SDK (@google-cloud/vision)</option>
                    <option value="tesseract">Tesseract.js (Offline / Sandbox Fallback)</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    System automatically falls back to Tesseract.js when external cloud quotas or credentials are unconfigured.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-800">Gemini Extraction Model</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
                  >
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash (Fast Hybrid Reasoning & Extraction) [Recommended]</option>
                    <option value="gemini-3.7-pro">Gemini 3.7 Pro (Advanced Multimodal & Complex Legal Analysis)</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (High-Throughput Vision & Text)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Legacy Fast Inference)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-800">
                    Minimum Rule Confidence Threshold ({Math.round(Number(confidenceThreshold) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.50"
                    max="0.99"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(e.target.value)}
                    className="w-full accent-[#12304A]"
                  />
                  <span className="text-xs text-slate-500">
                    Detections below this confidence level are routed to <strong className="font-semibold text-slate-800">REQUIRES_REVIEW</strong> for manual officer verification.
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Database & Knowledge Base"
                description="Database connection and legal metrology knowledge vector status"
              />
              <CardBody className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 overflow-hidden items-stretch rounded border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="font-semibold text-slate-900">PostgreSQL (Drizzle ORM)</div>
                    <div className="text-xs text-slate-600">Includes in-memory resilient fallback for local demo mode</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 overflow-hidden items-stretch rounded border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="font-semibold text-slate-900">pgvector Knowledge RAG</div>
                    <div className="text-xs text-slate-600">Official Gazette 2011 + amendments knowledge base</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      Vector Ready
                    </span>
                  </div>
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-between bg-slate-50/50">
                {saved && (
                  <span className="text-sm font-semibold text-emerald-700">
                    ✓ Configuration saved successfully
                  </span>
                )}
                {!saved && <span />}
                <Button type="submit" variant="primary" icon={<Save className="h-4 w-4" aria-hidden="true" />}>
                  Save Settings
                </Button>
              </CardFooter>
            </Card>
          </form>
        </main>
      </div>
    </div>
  );
}
