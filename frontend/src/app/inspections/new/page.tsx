"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  ScanSearch,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Building2,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const PIPELINE_STEPS = [
  "Image uploaded and validated",
  "Image preprocessing (EXIF normalizer, CLAHE contrast)",
  "Text extraction (High-DPI OCR)",
  "Mandatory declaration structured extraction",
  "Commodity classification (Rule applicability)",
  "Deterministic Rule validation (Rule 6, 7, 8, 9)",
  "RAG legal grounding & compliance scoring",
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

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const validFiles = files.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(
        file.type,
      ),
    );

    if (validFiles.length !== files.length) {
      setError("Only JPG, PNG, and WebP images are allowed.");
    } else {
      setError(null);
    }

    if (validFiles.length === 0) return;

    // ADD to existing selection instead of replacing it
    setSelectedFiles((previous) => {
      const existingKeys = new Set(
        previous.map(
          (file) => `${file.name}-${file.size}-${file.lastModified}`,
        ),
      );

      const newFiles = validFiles.filter(
        (file) =>
          !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
      );

      return [...previous, ...newFiles];
    });

    setPreviewUrls((previous) => [
      ...previous,
      ...validFiles.map((file) => URL.createObjectURL(file)),
    ]);

    if (!productName) {
      setProductName(
        validFiles[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
      );
    }

    // Allow selecting the same file again later
    e.target.value = "";
  };

  const handleSampleFill = () => {
    setProductName("SunPure Fortified Mustard Oil (1L)");
    setCategory("Edible Oils");
    setBrand("SunPure Edibles");
    setLocation("Zonal Inspection Field Office");
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((previous) => previous.filter((_, i) => i !== index));

    setPreviewUrls((previous) => {
      const urlToRemove = previous[index];

      if (urlToRemove) {
        URL.revokeObjectURL(urlToRemove);
      }

      return previous.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    if (selectedFiles.length === 0) {
      setError("Please select or drop a commodity package image.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setCurrentStepIndex(0);

    try {
      // Step 1 & 2: Upload
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      console.log(
        "[UPLOAD] FormData files:",
        Array.from(formData.getAll("files")).map((file: any) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      );

      formData.append("productName", productName || "Sample Commodity");
      formData.append("category", category);
      formData.append("brand", brand);
      formData.append("location", location);

      console.log(
        "[UPLOAD] Selected files:",
        selectedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      );

      const uploadRes = await fetch(`${API_BASE_URL}/api/scans/upload`, {
        method: "POST",
        headers: {
          authorization: "Bearer dev-inspector",
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      const scanId = uploadData.data.scanId;

      // Advance progress steps visually
      setCurrentStepIndex(2);
      await new Promise((r) => setTimeout(r, 600));

      setCurrentStepIndex(2);

      const analyzeRes = await fetch(
        `${API_BASE_URL}/api/inspections/${scanId}/analyze`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer dev-inspector",
          },
        },
      );

      const analyzeJson = await analyzeRes.json();

      console.log("========== ANALYSIS RESULT ==========");
      console.log(analyzeJson.data);
      console.log("======================================");

      if (!analyzeRes.ok || !analyzeJson.success) {
        throw new Error(analyzeJson?.error?.message || "Analysis failed");
      }

      setCurrentStepIndex(6);

      router.push(`/inspections/${scanId}`);
    } catch (err: any) {
      setError(err.message || "Failed to process inspection");
      setIsProcessing(false);
      setCurrentStepIndex(-1);
    }
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
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Initiate New Commodity Inspection
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Upload packaged commodity image for automated OCR declaration
                extraction and statutory verification.
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            /* Progress Pipeline Screen */
            <Card>
              <CardHeader
                title="Automated Regulatory Screening in Progress"
                description="Executing computer vision, declaration parsing, and statutory rule validation"
              />
              <CardBody className="py-8 space-y-6">
                <div className="flex items-center justify-center py-4">
                  <div className="p-4 bg-blue-50 text-[#2563EB] rounded-full border border-blue-100 animate-pulse">
                    <ScanSearch className="w-10 h-10" />
                  </div>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-colors ${
                          isDone
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                            : isCurrent
                              ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>{step}</span>
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
                {/* Left: Upload Dropzone */}
                <Card>
                  <CardHeader
                    title="1. Packaging Image Upload"
                    description="Clear frontal photo of Principal Display Panel (PDP)"
                  />
                  <CardBody className="space-y-4">
                    <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 text-center transition-colors bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer min-h-[260px] relative overflow-hidden">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {previewUrls.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                          {previewUrls.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                            >
                              <img
                                src={url}
                                alt={`Package image ${index + 1}`}
                                className="w-full h-40 object-contain"
                              />

                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs text-red-600"
                              >
                                Remove
                              </button>

                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">
                            Upload Product Image
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            Drag and drop package photo or browse local files.
                          </p>
                          <span className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 shadow-2xs">
                            Browse Files
                          </span>
                        </>
                      )}

                      {previewUrls.length > 0 && (
                        <div className="mt-4">
                          <label
                            htmlFor="package-images"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />
                            Add More Images
                          </label>
                        </div>
                      )}

                      {selectedFiles.length > 0 && (
                        <p className="text-sm text-slate-600 mt-2">
                          {selectedFiles.length} package image
                          {selectedFiles.length !== 1 ? "s" : ""} selected
                        </p>
                      )}
                    </label>

                    <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      ✓ Supported: JPG, PNG, WebP (max 20MB)
                      <br />✓ Automatically preprocessed for glare and contrast
                      enhancement.
                    </div>
                  </CardBody>
                </Card>

                {/* Right: Inspection Context */}
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
                        placeholder="e.g. Fortified Cooking Oil 1L"
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
                        <option value="Packaged Food">
                          Packaged Food & Grains
                        </option>
                        <option value="Cosmetics & Toiletries">
                          Cosmetics & Toiletries
                        </option>
                        <option value="Spices & Condiments">
                          Spices & Condiments
                        </option>
                        <option value="General Commodity">
                          General Packaged Commodity
                        </option>
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
                  </CardBody>
                </Card>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="text-xs text-slate-500">
                  Ready to execute Legal Metrology Rules, 2011 automated
                  compliance analysis.
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={selectedFiles.length == 0 || isProcessing}
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
