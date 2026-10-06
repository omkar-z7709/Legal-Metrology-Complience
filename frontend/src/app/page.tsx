"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusType } from "@/components/ui/Badge";
import { API_BASE_URL, BackendHealthResponse, checkBackendHealth } from "@/lib/api";
import { fetchWithCache } from "@/lib/cache";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  ScanSearch,
  Server,
  ShieldCheck,
  Video,
} from "lucide-react";

const violationLabels: Record<string, string> = {
  MISSING_DECLARATION: "Missing declaration",
  INVALID_MRP: "MRP declaration",
  INVALID_NET_QUANTITY: "Net quantity",
  MISSING_MANUFACTURER: "Manufacturer / packer details",
  MISSING_CONSUMER_CARE: "Consumer care details",
  COUNTRY_OF_ORIGIN: "Country of origin",
  FONT_SIZE: "Declaration font size",
  READABILITY: "Legibility and contrast",
  PLACEMENT: "Declaration placement",
  NON_STANDARD_DECLARATION: "Other declaration issues",
};

function formatStatus(value: unknown): StatusType {
  if (value === "COMPLIANT" || value === "NON_COMPLIANT" || value === "REQUIRES_REVIEW") {
    return value;
  }
  return "NEUTRAL";
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function DashboardPage() {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (forceFresh = false) => {
    setIsRefreshing(true);
    setHealthError(null);
    const [healthResult, statsResult] = await Promise.allSettled([
      checkBackendHealth(),
      fetchWithCache(
        `${API_BASE_URL}/api/dashboard/stats`,
        { headers: { authorization: "Bearer dev-inspector" } },
        forceFresh ? 0 : 60000
      ),
    ]);

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
      setHealthError("Unable to reach the service health endpoint.");
    }

    if (statsResult.status === "fulfilled" && statsResult.value?.success && statsResult.value.data) {
      setStats(statsResult.value.data);
    } else if (statsResult.status === "rejected") {
      setHealthError((current) => current || "Dashboard records could not be loaded.");
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const metrics = stats?.metrics;
  const totalInspections = Number(metrics?.totalInspections ?? 0);
  const compliant = Number(metrics?.compliant ?? 0);
  const nonCompliant = Number(metrics?.nonCompliant ?? 0);
  const requiresReview = Number(metrics?.requiresReview ?? 0);
  const complianceRate = Number(metrics?.complianceRatePercentage ?? 0);
  const metricValue = (value: number) => stats ? value.toLocaleString() : "—";
  const recentList = Array.isArray(stats?.recentInspections) ? stats.recentInspections : [];
  const violationCategories = Object.entries(stats?.violationsBreakdown?.categories || {})
    .map(([key, value]) => ({ category: violationLabels[key] || key.replaceAll("_", " ").toLowerCase(), count: Number(value) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxViolationCount = Math.max(...violationCategories.map((item) => item.count), 1);

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Enforcement Dashboard" }]} isRefreshing={isRefreshing} />
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Enforcement operations</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Compliance overview
              </h1>
              <p className="mt-1 text-sm text-slate-600">Legal Metrology (Packaged Commodities) Rules, 2011</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/inspections/new">
                <Button variant="primary" icon={<ScanSearch className="h-4 w-4" />}>
                  New inspection
                </Button>
              </Link>
              <Link href="/inspections/live">
                <Button variant="secondary" icon={<Video className="h-4 w-4" />}>
                  Live Lot Inspection
                </Button>
              </Link>
            </div>
          </header>

          <section aria-label="System health" className="flex flex-col gap-3 border-y border-slate-300 bg-[#EAF0F4] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-4 w-4 text-[#12304A]" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Platform services</p>
                <p className="text-xs text-slate-600">API and database connectivity</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Fastify API</span>
                {health ? (
                  <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-800">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Unavailable
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Database</span>
                {health?.dependencies.supabase.status === "connected" ? (
                  <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Connected ({health.dependencies.supabase.latencyMs} ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
                    <Clock3 className="h-3 w-3" aria-hidden="true" /> Status unavailable
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void loadDashboardData(true)}
                disabled={isRefreshing}
                className="font-medium text-blue-800 underline-offset-2 hover:underline disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing…" : "Refresh status"}
              </button>
            </div>
          </section>

          {healthError && (
            <div role="status" className="border-l-4 border-amber-600 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {healthError} Displayed totals reflect the last successfully loaded response.
            </div>
          )}

          <section aria-label="Inspection summary" className="grid grid-cols-2 divide-x divide-y divide-slate-200 border border-slate-300 bg-white xl:grid-cols-4 xl:divide-y-0">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total inspections</span>
                <FileCheck2 className="h-4 w-4 text-blue-800" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-[#12304A]">{metricValue(totalInspections)}</p>
              <p className="mt-1 text-xs text-slate-500">All recorded inspection records</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Compliant</span>
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              </div>
              <p className="mt-3 flex items-baseline gap-2 text-2xl font-semibold tabular-nums text-emerald-800">
                {metricValue(compliant)}<span className="text-xs font-medium text-slate-600">{stats ? `${complianceRate}% of total` : "Rate unavailable"}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Backend-reported status total</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-800">Non-compliant</span>
                <AlertOctagon className="h-4 w-4 text-red-700" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-red-800">{metricValue(nonCompliant)}</p>
              <p className="mt-1 text-xs text-slate-500">Backend-reported status total</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">Requires review</span>
                <Clock3 className="h-4 w-4 text-amber-800" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-amber-900">{metricValue(requiresReview)}</p>
              <p className="mt-1 text-xs text-slate-500">Awaiting officer review</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
            <Card>
              <CardHeader
                title="Detected declaration issues"
                description="Counts returned by the dashboard statistics endpoint; not limited to a date range."
                action={<span className="text-xs text-slate-500">{stats ? `${Number(stats?.violationsBreakdown?.totalViolations ?? 0).toLocaleString()} total` : "Unavailable"}</span>}
              />
              <CardBody className="space-y-4">
                {violationCategories.length ? violationCategories.map((item) => (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-800">{item.category}</span>
                      <span className="shrink-0 tabular-nums text-slate-600">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100">
                      <div className="h-full bg-[#176B73]" style={{ width: `${(item.count / maxViolationCount) * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <p className="border-l-2 border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                    {stats ? "No violation counts were returned for these records." : "Violation data is unavailable until dashboard statistics load."}
                  </p>
                )}
              </CardBody>
              <CardFooter className="gap-3">
                <span className="text-xs text-slate-600">Categories are grouped by the backend rule classifier.</span>
                <Link href="/analytics" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
                  Analytics <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col">
              <CardHeader title="Start an inspection" description="Begin a package-label screening workflow." />
              <CardBody className="flex flex-1 flex-col justify-between gap-6">
                <div className="border border-slate-300 bg-slate-50 p-5">
                  <ScanSearch className="mb-3 h-5 w-5 text-[#12304A]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900">Create inspection record</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Upload packaging images to extract declarations and run automated checks. Officer review remains the final determination.
                  </p>
                  <Link href="/inspections/new" className="mt-4 inline-block">
                    <Button size="sm">Open inspection intake</Button>
                  </Link>
                </div>
                <div className="flex gap-3 border-t border-slate-200 pt-4">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    Applicable checks include declarations, principal display panel, letter size, and manner of declaration under the packaged commodities rules.
                  </p>
                </div>
              </CardBody>
            </Card>
          </section>

          <Card>
            <CardHeader
              title="Recent inspections"
              description="Latest records returned by the backend. Automated assessment is not a substitute for officer determination."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex"><Filter className="h-3.5 w-3.5" aria-hidden="true" /> Latest records</span>
                  <Link href="/inspections"><Button variant="secondary" size="sm">View registry</Button></Link>
                </div>
              }
            />
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-5 py-3">Record</th>
                    <th scope="col" className="px-5 py-3">Commodity</th>
                    <th scope="col" className="px-5 py-3">Created</th>
                    <th scope="col" className="px-5 py-3">Assessment</th>
                    <th scope="col" className="px-5 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentList.map((item: any) => {
                    const scanId = item.id;
                    const title = item.productName || item.analysis?.declarations?.generic_name?.value || item.location || "Commodity not identified";
                    const identifier = item.scanNumber || item.id || "Record ID unavailable";
                    const status = formatStatus(item.complianceStatus || item.status);
                    return (
                      <tr key={scanId} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">{identifier}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{title}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDate(item.createdAt)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={status} size="sm" /></td>
                        <td className="px-5 py-3.5 text-right">
                          {scanId ? (
                            <Link href={`/inspections/${scanId}`} aria-label={`View inspection ${identifier}`} className="inline-flex rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          ) : <span className="text-slate-500">Unavailable</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {!recentList.length && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-600">
                        {stats ? "No inspection records are available yet." : "Recent inspections are unavailable until dashboard data loads."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="flex flex-col divide-y divide-slate-100 md:hidden">
                {recentList.map((item: any) => {
                  const scanId = item.id;
                  const title = item.productName || item.analysis?.declarations?.generic_name?.value || item.location || "Commodity not identified";
                  const identifier = item.scanNumber || item.id || "Record ID unavailable";
                  const status = formatStatus(item.complianceStatus || item.status);
                  return (
                    <div key={scanId} className="flex flex-col gap-2 p-4 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-900">{identifier}</span>
                        <StatusBadge status={status} size="sm" />
                      </div>
                      <div className="font-medium text-slate-900">{title}</div>
                      <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
                      {scanId && (
                        <div className="mt-2">
                          <Link href={`/inspections/${scanId}`} className="block">
                            <Button variant="secondary" className="w-full justify-center" size="sm" icon={<Eye className="h-4 w-4" aria-hidden="true" />}>
                              View record
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!recentList.length && (
                  <div className="p-6 text-center text-sm text-slate-600">
                    {stats ? "No inspection records are available yet." : "Recent inspections are unavailable until dashboard data loads."}
                  </div>
                )}
              </div>
            </div>
            <CardFooter className="bg-slate-50/50">
              <span className="text-xs text-slate-600">Showing {recentList.length} recent records{stats ? ` of ${totalInspections.toLocaleString()} total` : ""}</span>
              <Link href="/inspections" className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">
                Open all records <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardFooter>
          </Card>

          <footer className="border-t border-slate-300 pt-4 text-center text-xs text-slate-600">
            <p className="font-medium">Automated screening supports, but does not replace, an authorized officer&apos;s final determination.</p>
            <p className="mx-auto mt-1 max-w-3xl text-[11px] text-slate-500">
              MySS extracts package declarations and identifies potential issues under the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
