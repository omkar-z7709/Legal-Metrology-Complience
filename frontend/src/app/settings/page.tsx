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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "System & Inspection Settings" }]} />

        <main className="p-8 max-w-4xl w-full mx-auto space-y-6 flex-1">
          <div className="pb-2 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
              Inspection Engine Configuration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure OCR providers, LLM extraction models, and regulatory threshold parameters (Module 18).
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader
                title="Vision & Extraction Pipeline"
                description="Select default OCR service and generative structured declaration parser"
              />
              <CardBody className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary OCR Service</label>
                  <select
                    value={ocrEngine}
                    onChange={(e) => setOcrEngine(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                  >
                    <option value="google-vision">Google Cloud Vision SDK (@google-cloud/vision)</option>
                    <option value="tesseract">Tesseract.js (Offline / Sandbox Fallback)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    System automatically falls back to Tesseract.js when external cloud quotas or credentials are unconfigured.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gemini Extraction Model</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                  >
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash (Fast Hybrid Reasoning & Extraction) [Recommended]</option>
                    <option value="gemini-3.7-pro">Gemini 3.7 Pro (Advanced Multimodal & Complex Legal Analysis)</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (High-Throughput Vision & Text)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Legacy Fast Inference)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Minimum Rule Confidence Threshold ({Math.round(Number(confidenceThreshold) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.50"
                    max="0.99"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(e.target.value)}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-500">
                    Detections below this confidence level are routed to <strong>REQUIRES_REVIEW</strong> for manual officer verification.
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Supabase & Drizzle ORM Infrastructure"
                description="Database connection and pgvector semantic retrieval status"
              />
              <CardBody className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <div className="font-semibold text-slate-800">PostgreSQL (Drizzle ORM)</div>
                    <div className="text-[11px] text-slate-500">Includes in-memory resilient fallback for local demo mode</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <div className="font-semibold text-slate-800">pgvector Legal Metrology Rules RAG</div>
                    <div className="text-[11px] text-slate-500">Official Gazette 2011 + amendments knowledge base</div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">
                    Vector Ready
                  </span>
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-between">
                {saved && (
                  <span className="text-xs text-emerald-700 font-semibold">
                    ✓ Configuration saved successfully!
                  </span>
                )}
                <Button type="submit" variant="primary" className="ml-auto" icon={<Save className="w-4 h-4" />}>
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
