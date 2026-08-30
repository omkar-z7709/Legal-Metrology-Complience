"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusType } from "@/components/ui/Badge";
import { checkBackendHealth, BackendHealthResponse } from "@/lib/api";
import {
  ShieldCheck,
  AlertOctagon,
  Clock3,
  FileCheck2,
  ScanSearch,
  ArrowUpRight,
  TrendingUp,
  Filter,
  Eye,
  FileText,
  Building2,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import Link from "next/link";

interface InspectionSummary {
  id: string;
  productName: string;
  category: string;
  brand: string;
  date: string;
  inspector: string;
  status: StatusType;
  score: number;
  violationsCount: number;
}

const mockRecentInspections: InspectionSummary[] = [
  {
    id: "INS-2026-0891",
    productName: "Fortified Sunflower Cooking Oil (1L)",
    category: "Edible Oils",
    brand: "SunPure Naturals",
    date: "26 Aug 2026, 14:32",
    inspector: "Officer Sarthak Verma",
    status: "NON_COMPLIANT",
    score: 68,
    violationsCount: 2,
  },
  {
    id: "INS-2026-0890",
    productName: "Premium Instant Coffee Jar 200g",
    category: "Packaged Food",
    brand: "Café Classic",
    date: "26 Aug 2026, 13:15",
    inspector: "Officer Anita Rao",
    status: "COMPLIANT",
    score: 100,
    violationsCount: 0,
  },
  {
    id: "INS-2026-0889",
    productName: "Organic Turmeric Powder 500g",
    category: "Spices & Condiments",
    brand: "Vedic Roots",
    date: "26 Aug 2026, 11:40",
    inspector: "Officer Sarthak Verma",
    status: "REQUIRES_REVIEW",
    score: 82,
    violationsCount: 1,
  },
  {
    id: "INS-2026-0888",
    productName: "Moisturizing Bath Soap 125g (Pack of 3)",
    category: "Cosmetics & Toiletries",
    brand: "SilkCare Ltd.",
    date: "25 Aug 2026, 17:05",
    inspector: "Officer Rajesh Kumar",
    status: "NON_COMPLIANT",
    score: 55,
    violationsCount: 3,
  },
  {
    id: "INS-2026-0887",
    productName: "Aromatic Basmati Rice 5kg",
    category: "Food Grains",
    brand: "Royal Grain Co.",
    date: "25 Aug 2026, 15:22",
    inspector: "Officer Anita Rao",
    status: "COMPLIANT",
    score: 100,
    violationsCount: 0,
  },
];

const violationBreakdown = [
  { category: "Missing Mandatory Declaration", count: 124, percentage: 38 },
  { category: "MRP Formatting / Unit Sale Price (Rule 6)", count: 86, percentage: 26 },
  { category: "Net Quantity Font Size & Placement", count: 48, percentage: 15 },
  { category: "Consumer Care Details Deficient", count: 39, percentage: 12 },
  { category: "Date of Mfg / Expiry Obscured", count: 29, percentage: 9 },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadHealth = async () => {
    setIsRefreshing(true);
    setHealthError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
    } catch (err: any) {
      setHealthError(err.message || "Failed to connect to backend");
      setHealth(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Government Navigation Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbs={[{ label: "Enforcement Dashboard" }]}
          onRefresh={loadHealth}
          isRefreshing={isRefreshing}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Enforcement & Compliance Overview
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Legal Metrology (Packaged Commodities) Rules, 2011 Automated Inspection System
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/inspections/new">
                <Button
                  variant="primary"
                  icon={<ScanSearch className="w-4 h-4" />}
                >
                  New Inspection
                </Button>
              </Link>
            </div>
          </div>

          {/* Module 0 Subsystem Health Pill */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-[#12304A]">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Subsystem Infrastructure Status
                </div>
                <div className="text-xs text-slate-500">
                  Fastify Backend (v0.1.0) & Supabase Integration (Module 0 Foundation)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Fastify API:</span>
                {health ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Online ({health.system.memoryMb} MB)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Disconnected
                  </span>
                )}
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Supabase DB:</span>
                {health?.dependencies.supabase.status === "connected" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Connected ({health.dependencies.supabase.latencyMs}ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                    <Clock3 className="w-3 h-3" /> Standby ({health?.dependencies.supabase.latencyMs || 0}ms)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Inspections */}
            <Card>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Inspections
                  </span>
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#12304A]">1,248</span>
                  <span className="text-xs font-medium text-emerald-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +12% this mo.
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Across 412 registered manufacturers
                </div>
              </CardBody>
            </Card>

            {/* Compliant Packages */}
            <Card>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    Compliant
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-700">823</span>
                  <span className="text-xs font-medium text-slate-500">
                    (65.9% pass rate)
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Passed all mandatory Rule 6 checks
                </div>
              </CardBody>
            </Card>

            {/* Non-Compliant */}
            <Card>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                    Non-Compliant
                  </span>
                  <div className="p-2 bg-red-50 text-red-700 rounded-lg">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-700">312</span>
                  <span className="text-xs font-medium text-red-600">
                    24.9% flagged
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Violations mapped to legal clauses
                </div>
              </CardBody>
            </Card>

            {/* Requires Review */}
            <Card>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                    Requires Review
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                    <Clock3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-700">113</span>
                  <span className="text-xs font-medium text-amber-700">
                    9.2% pending
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Awaiting officer review / clarification
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Analytics & Breakdown Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Violation Breakdown (2 cols) */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Statutory Violation Distribution"
                description="Breakdown of detected non-compliance instances by Rule requirement"
                action={
                  <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
                }
              />
              <CardBody className="space-y-4">
                {violationBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="text-slate-500">
                        {item.count} cases ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#12304A] rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardBody>
              <CardFooter>
                <div className="text-xs text-slate-500">
                  Highest non-compliance found in: <strong className="text-slate-700">Edible Oils & FMCG Food</strong>
                </div>
                <Link
                  href="/analytics"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Full Analytics <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </CardFooter>
            </Card>

            {/* Quick Inspection Action Box */}
            <Card className="flex flex-col justify-between">
              <CardHeader
                title="Initiate Fast Inspection"
                description="Upload commodity packaging for OCR and Rule check"
              />
              <CardBody className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                    <ScanSearch className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Upload Package Image
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Supports JPEG/PNG up to 20MB. Automatically extracts MRP, Net Qty, Mfg Date, and Manufacturer details.
                  </p>
                  <Link href="/inspections/new" className="inline-block mt-4">
                    <Button variant="primary" size="sm">
                      Start Scanning
                    </Button>
                  </Link>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" /> Applicable Regulations
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Rule 6 (Declarations), Rule 7 (Principal Display Panel), Rule 8 (Letter & Font Size), Rule 9 (Manner of Declaration).
                  </p>
                </div>
              </CardBody>
              <CardFooter>
                <span className="text-[11px] text-slate-500">Supported formats: JPG, PNG, PDF</span>
              </CardFooter>
            </Card>
          </section>

          {/* Recent Inspections Table */}
          <Card>
            <CardHeader
              title="Recent Package Inspections"
              description="Chronological log of commodities screened with automated legal assessment"
              action={
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                    <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter
                  </button>
                  <Link href="/inspections">
                    <Button variant="secondary" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Inspection ID</th>
                    <th className="px-6 py-3">Commodity & Brand</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Date & Inspector</th>
                    <th className="px-6 py-3">Compliance Status</th>
                    <th className="px-6 py-3 text-center">Score</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mockRecentInspections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-500 font-medium">
                        {item.id}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">{item.brand}</div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {item.category}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-slate-800 font-medium">{item.date}</div>
                        <div className="text-[11px] text-slate-500">{item.inspector}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs ${
                            item.score >= 90
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.score >= 70
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.score}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/inspections/${item.id}`}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="View Inspection Details & Evidence"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Download Legal Inspection Report"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardFooter>
              <span className="text-xs text-slate-500">
                Showing 5 of 1,248 total recorded inspections
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="px-2.5 py-1 text-xs text-slate-400 bg-white border border-slate-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50">
                  Next
                </button>
              </div>
            </CardFooter>
          </Card>

          {/* Legal Regulatory Notice Footer */}
          <footer className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">
              Government of India • Ministry of Consumer Affairs, Food & Public Distribution • Department of Consumer Affairs
            </p>
            <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
              Automated screening assists enforcement officers by extracting declarations and identifying potential compliance issues under Legal Metrology (Packaged Commodities) Rules, 2011. Final regulatory determination remains subject to authorized officer review.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
