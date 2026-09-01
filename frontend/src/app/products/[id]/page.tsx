"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusType } from "@/components/ui/Badge";
import {
  Package,
  History,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { API_BASE_URL, authFetch } from "@/lib/api";

export default function ProductHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/products/${id}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProductData(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const product = productData?.product || {
    id,
    name: "SunPure Kachi Ghani Mustard Oil (1L)",
    brand: "SunPure",
    category: "Edible Oils",
    commodityType: "Liquid",
    manufacturerName: "SunPure Edibles Pvt. Ltd., Plot 14, Alwar, Rajasthan",
  };

  const inspectionHistory = productData?.history?.length > 0 ? productData.history : [
    {
      id: "scan-03",
      scanNumber: "INS-2026-881921",
      createdAt: "2026-08-26T14:30:00.000Z",
      complianceStatus: "COMPLIANT",
      complianceScore: "100.00",
      reviewStatus: "ACCEPTED",
      notes: "Packager corrected MRP tax inclusive statement and added consumer grievance email.",
    },
    {
      id: "scan-02",
      scanNumber: "INS-2026-771829",
      createdAt: "2026-07-15T11:20:00.000Z",
      complianceStatus: "NON_COMPLIANT",
      complianceScore: "65.00",
      reviewStatus: "REJECTED",
      notes: "Flagged notice issued for missing 'Inclusive of all taxes' declaration.",
    },
    {
      id: "scan-01",
      scanNumber: "INS-2026-661738",
      createdAt: "2026-05-10T09:45:00.000Z",
      complianceStatus: "COMPLIANT",
      complianceScore: "95.00",
      reviewStatus: "ACCEPTED",
      notes: "Baseline inspection passed.",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbs={[
            { label: "Products Registry", href: "/products" },
            { label: product.name },
          ]}
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-6 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link href="/products">
                <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                  {product.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Longitudinal Regulatory History • {inspectionHistory.length} Inspection Audits Logged
                </p>
              </div>
            </div>
          </div>

          {/* Product Profile Card */}
          <Card>
            <CardBody className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Brand / Trademark</span>
                <div className="text-slate-800 font-semibold text-sm mt-0.5">{product.brand || "N/A"}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Statutory Category</span>
                <div className="text-slate-800 font-semibold text-sm mt-0.5">{product.category}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Commodity Nature</span>
                <div className="text-slate-800 font-semibold text-sm mt-0.5">{product.commodityType || "Solid/Liquid"}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Manufacturer</span>
                <div className="text-slate-800 font-medium text-xs mt-0.5">{product.manufacturerName || "Declared on Label"}</div>
              </div>
            </CardBody>
          </Card>

          {/* Longitudinal Timeline */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-[#12304A]" /> Longitudinal Inspection Trail (Module 16)
            </h2>

            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
              {inspectionHistory.map((scan: any, idx: number) => (
                <div key={scan.id || idx} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      scan.complianceStatus === "COMPLIANT"
                        ? "bg-emerald-500"
                        : scan.complianceStatus === "NON_COMPLIANT"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader
                      title={
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                            {scan.scanNumber}
                          </span>
                          <StatusBadge status={scan.complianceStatus as StatusType} size="sm" />
                        </div>
                      }
                      action={
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(scan.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      }
                    />
                    <CardBody className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Compliance Score: <strong>{scan.complianceScore || 100}%</strong></span>
                        <span className="text-slate-500">Officer Decision: <strong className="text-slate-800">{scan.reviewStatus || "ACCEPTED"}</strong></span>
                      </div>
                      {scan.notes && (
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded text-slate-600 text-[11px]">
                          <strong>Inspector Observation:</strong> {scan.notes}
                        </div>
                      )}
                    </CardBody>
                    <CardFooter>
                      <Link href={`/inspections/${scan.id}`} className="ml-auto">
                        <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>
                          View Full Evidence & Checks
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
