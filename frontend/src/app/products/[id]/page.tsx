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
import { API_BASE_URL } from "@/lib/api";

export default function ProductHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/${id}/history`, {
      headers: { authorization: "Bearer dev-inspector" },
    })
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
      notes: "Packager corrected MRP tax inclusive statement and added consumer grievance email.",
    },
    {
      id: "scan-02",
      scanNumber: "INS-2026-771829",
      createdAt: "2026-07-15T11:20:00.000Z",
      complianceStatus: "NON_COMPLIANT",
      notes: "Flagged notice issued for missing 'Inclusive of all taxes' declaration.",
    },
    {
      id: "scan-01",
      scanNumber: "INS-2026-661738",
      createdAt: "2026-05-10T09:45:00.000Z",
      complianceStatus: "COMPLIANT",
      notes: "Baseline inspection passed.",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          breadcrumbs={[
            { label: "Commodities", href: "/products" },
            { label: product.name },
          ]}
        />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-3">
              <Link href="/products" className="mt-1 shrink-0">
                <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                  Back
                </Button>
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">Commodity Timeline</p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                  {product.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {inspectionHistory.length} inspection records
                </p>
              </div>
            </div>
          </header>

          <Card>
            <CardBody className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Brand / Trademark</span>
                <div className="mt-1 text-sm font-semibold text-slate-800">{product.brand || "N/A"}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</span>
                <div className="mt-1 text-sm font-semibold text-slate-800">{product.category}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nature</span>
                <div className="mt-1 text-sm font-semibold text-slate-800">{product.commodityType || "Solid/Liquid"}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manufacturer</span>
                <div className="mt-1 text-sm font-medium text-slate-800">{product.manufacturerName || "Declared on Label"}</div>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-700">
              <History className="h-4 w-4 text-[#12304A]" aria-hidden="true" /> Inspection record history
            </h2>

            <div className="ml-4 space-y-6 border-l-2 border-slate-200 pl-6 relative">
              {inspectionHistory.map((scan: any, idx: number) => (
                <div key={scan.id || idx} className="relative">
                  <div
                    className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-slate-100 shadow-sm ${
                      scan.complianceStatus === "COMPLIANT"
                        ? "bg-emerald-500"
                        : scan.complianceStatus === "NON_COMPLIANT"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                    aria-hidden="true"
                  />

                  <Card>
                    <CardHeader
                      title={
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                            {scan.scanNumber}
                          </span>
                          <StatusBadge status={scan.complianceStatus as StatusType} size="sm" />
                        </div>
                      }
                      action={
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {new Date(scan.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      }
                    />
                    {scan.notes && (
                      <CardBody className="border-t border-slate-100">
                        <div className="rounded bg-slate-50 p-3 text-sm text-slate-700">
                          <strong className="font-medium text-slate-900">Observation:</strong> {scan.notes}
                        </div>
                      </CardBody>
                    )}
                    <CardFooter className="bg-slate-50/50">
                      <Link href={`/inspections/${scan.id}`} className="ml-auto">
                        <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}>
                          View record
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
