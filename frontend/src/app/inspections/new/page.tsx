"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  ScanSearch,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const REAL_STAGES = [
  { key: "UPLOADING", label: "Image upload & package validation" },
  { key: "PREPROCESSING", label: "EXIF normalization & CLAHE contrast boost" },
  { key: "OCR", label: "Optical character recognition (Tesseract / Cloud Vision)" },
  { key: "EXTRACTION", label: "Gemini AI structured mandatory declaration parsing" },
  { key: "CLASSIFICATION", label: "Commodity category & Rule 6 applicability classification" },
  { key: "COMPLIANCE", label: "Deterministic rule engine validation & Gazette RAG grounding" },
  { key: "SAVING", label: "Persisting statutory inspection findings & audit logs" },
];

export default function NewInspectionPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Form Fields
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Edible Oils");
  const [brand, setBrand] = useState("");
  const [location, setLocation] = useState("Central Enforcement Zone");
  const [listingText, setListingText] = useState("");

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<string>("UPLOADING");
  const [error, setError] = useState<string | null>(null);

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
    setBrand("SunPure Edibles");
    setLocation("Zonal Inspection Field Office");
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
      setError("Please select or drop at least one commodity package image.");
      return;
    }

    const token = localStorage.getItem("lm_auth_token") || "dev-inspector";

    setError(null);
    setIsProcessing(true);
    setActiveStage("UPLOADING");

    let isPolling = true;

    try {
      // Step 1: Upload images & initialize scan
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("productName", productName || "Sample Commodity");
      formData.append("category", category);
      formData.append("brand", brand);
      formData.append("location", location);
      if (listingText) formData.append("listingText", listingText);

      const uploadRes = await fetch(`${API_BASE_URL}/api/scans/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(`Package upload failed with status ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      const scanId = uploadData.data.scanId;

      const executePoll = async () => {
        if (!isPolling) return;
        try {
          const pollRes = await fetch(`${API_BASE_URL}/api/scans/${scanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pollRes.ok) {
            const pollJson = await pollRes.json();
            if (pollJson.data?.scan?.currentStage) {
              setActiveStage(pollJson.data.scan.currentStage);
            }
          }
        } catch {}
        if (isPolling) {
          setTimeout(executePoll, 1000);
        }
      };
      setTimeout(executePoll, 500);

      // Step 2: Dispatch Analysis request (OCR -> Gemini -> Classification -> Compliance -> DB)
      const analyzeRes = await fetch(`${API_BASE_URL}/api/inspections/${scanId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      isPolling = false;

      const analyzeJson = await analyzeRes.json();

      if (!analyzeRes.ok || !analyzeJson.success) {
        throw new Error(analyzeJson?.error?.message || "Inspection analysis failed");
      }

      setActiveStage("COMPLETED");
      router.push(`/inspections/${scanId}`);
    } catch (err: any) {
      console.error("[FRONTEND] Inspection submission error:", err);
      setError(err.message || "Failed to process commodity inspection");
      setIsProcessing(false);
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
            { label: "Enforcement Dashboard", href: "/" },
            { label: "New Inspection" },
          ]}
        />

        <main className="p-8 max-w-5xl w-full mx-auto space-y-8 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Initiate New Commodity Inspection
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Upload packaged commodity images for OCR extraction, Gemini declaration parsing, and Legal Metrology rule evaluation.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleSampleFill}
              disabled={isProcessing}
            >
              Load Demonstration Preset
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            /* Real-Time Processing Stages UI */
            <Card>
              <CardHeader
                title="Automated Statutory Inspection Pipeline"
                description="Real-time status streamed directly from backend processing execution"
              />
              <CardBody className="py-8 space-y-6">
                <div className="flex items-center justify-center py-4">
                  <div className="p-4 bg-blue-50 text-[#2563EB] rounded-full border border-blue-100 animate-pulse">
                    <ScanSearch className="w-10 h-10" />
                  </div>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  {REAL_STAGES.map((st) => {
                    const status = getStageStatus(st.key);
                    return (
                      <div
                        key={st.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-colors ${
                          status === "DONE"
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                            : status === "PROCESSING"
                            ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        {status === "DONE" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : status === "PROCESSING" ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <div className="flex-1">
                          <div>{st.label}</div>
                          {status === "PROCESSING" && (
                            <div className="text-[10px] text-blue-600 font-mono mt-0.5 uppercase tracking-wider">
                              [Executing {st.key}]
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ) : (
            /* Upload & Metadata Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Package Images Upload */}
                <Card>
                  <CardHeader
                    title="1. Packaging Image Upload"
                    description="Clear photos of Principal Display Panel (PDP) and sides"
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

                    {previewUrls.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {previewUrls.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100 shadow-2xs group"
                            >
                              <img
                                src={url}
                                alt={`Package view ${index + 1}`}
                                className="w-full h-36 object-contain bg-white"
                              />

                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold hover:bg-red-700 shadow-xs transition-colors"
                              >
                                Remove
                              </button>

                              <div className="bg-slate-800/80 text-white text-[10px] px-2 py-0.5 text-center font-mono">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <label
                            htmlFor="package-images"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            Add More Images
                          </label>

                          <span className="text-xs text-slate-500 font-medium">
                            {selectedFiles.length} package image{selectedFiles.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="package-images"
                        className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 text-center transition-colors bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer min-h-[240px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Upload Package Image(s)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Drag & drop package photos or browse local files. Select multiple angles (Front, Back, Side panel).
                        </p>
                        <span className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 shadow-2xs">
                          Browse Files
                        </span>
                      </label>
                    )}

                    <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      ✓ Multiple images will be processed under <strong>ONE scan record</strong>.
                      <br />✓ EXIF orientation normalized & CLAHE contrast boost applied automatically.
                    </div>
                  </CardBody>
                </Card>

                {/* Inspection Context */}
                <Card>
                  <CardHeader
                    title="2. Inspection Context & Metadata"
                    description="Enter commodity and field inspection parameters"
                  />
                  <CardBody className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Commodity / Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Fortified Mustard Oil 1L"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Statutory Product Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      >
                        <option value="Edible Oils">Edible Oils & Fats</option>
                        <option value="Packaged Food">Packaged Food & Grains</option>
                        <option value="Cosmetics & Toiletries">Cosmetics & Toiletries</option>
                        <option value="Spices & Condiments">Spices & Condiments</option>
                        <option value="General Commodity">General Packaged Commodity</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Brand / Trademark Name
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. SunPure Edibles"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Inspection Hub / Retail Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Central Retail Zone"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Optional E-Commerce Product Listing Text / URL
                      </label>
                      <textarea
                        rows={2}
                        value={listingText}
                        onChange={(e) => setListingText(e.target.value)}
                        placeholder="Paste online product listing text or URL..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
                      />
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="text-xs text-slate-500">
                  Ready to execute Legal Metrology Rules, 2011 automated compliance analysis.
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={selectedFiles.length === 0 || isProcessing}
                  icon={<ScanSearch className="w-5 h-5" />}
                >
                  Analyze Commodity Compliance
                </Button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
