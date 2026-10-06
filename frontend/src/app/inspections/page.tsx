"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Eye, Search, Plus, Filter, Video } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { fetchWithCache } from "@/lib/cache";

export default function InspectionsListPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWithCache(
      `${API_BASE_URL}/api/scans`,
      { headers: { authorization: "Bearer dev-inspector" } },
      60000
    )
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.data.scans) {
          setScans(data.data.scans);
        }
      })
      .catch((err) => console.error("[FRONTEND] Error loading scans:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredScans = scans.filter((s) => {
    const productName =
      s.analysis?.declarations?.generic_name?.value ||
      s.productName ||
      "Commodity";
    const matchesSearch =
      s.scanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL" || s.complianceStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const LoadingRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="h-3 w-28 rounded bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-3 w-44 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-28 rounded bg-slate-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-3 w-32 rounded bg-slate-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-5 w-24 rounded bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-3 w-24 rounded bg-slate-100" />
          </td>
          <td className="px-6 py-4 text-right">
            <div className="ml-auto h-8 w-20 rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Inspections" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Inspections
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Authoritative statutory inspection history, search, and compliance filtering under Legal Metrology Rules, 2011.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/inspections/new">
                <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                  Initiate New Inspection
                </Button>
              </Link>
              <Link href="/inspections/live">
                <Button variant="secondary" icon={<Video className="w-4 h-4" />}>
                  Live Lot Inspection
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products or IDs..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-3 text-sm w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 font-medium">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-900"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLIANT">Compliant</option>
                  <option value="NON_COMPLIANT">Non-Compliant</option>
                  <option value="REQUIRES_REVIEW">Requires Review</option>
                </select>
              </div>
            </div>
          </div>

          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 text-sm font-medium text-slate-600 transition-opacity ${
              loading ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Loading statutory inspections...
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Commodity</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Violations</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <LoadingRows />
                  ) : filteredScans.length > 0 ? (
                    filteredScans.map((scan) => {
                      const productName =
                        scan.analysis?.declarations?.generic_name?.value ||
                        scan.productName ||
                        "Packaged Commodity";
                      const violationsCount =
                        scan.analysis?.violations?.length || 0;

                      return (
                        <tr
                          key={scan.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-slate-900 font-semibold">
                            <Link
                              href={`/inspections/${scan.id}`}
                              className="hover:underline text-blue-600"
                            >
                              {scan.scanNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">
                              {productName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {scan.analysis?.classification?.category ||
                                "General Commodity"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {scan.location || "Not specified"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                scan.complianceStatus || "REQUIRES_REVIEW"
                              }
                              size="sm"
                            />
                          </td>
                          <td className="px-6 py-4">
                            {violationsCount > 0 ? (
                              <span className="px-2 py-0.5 bg-red-50 text-red-700 font-bold rounded border border-red-200">
                                {violationsCount} Violation
                                {violationsCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-slate-400">None detected</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/inspections/${scan.id}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Eye className="w-4 h-4" />}
                              >
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No inspections found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
