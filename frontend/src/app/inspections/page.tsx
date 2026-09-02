"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Eye, Search, Plus, Filter, Calendar, UserCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function InspectionsListPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [inspectorFilter, setInspectorFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scans`, {
      headers: { authorization: "Bearer dev-inspector" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.scans) {
          setScans(data.data.scans);
        }
      })
      .catch((err) => console.error("[FRONTEND] Error loading scans:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredScans = scans.filter((s) => {
    const productName = s.analysis?.declarations?.generic_name?.value || s.productName || "Commodity";
    const inspectorName = s.inspectorId || "Sarthak Verma";
    const matchesSearch =
      s.scanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL" || s.complianceStatus === filterStatus;

    const matchesInspector =
      inspectorFilter === "ALL" || inspectorName.toLowerCase().includes(inspectorFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesInspector;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Loading statutory inspection history...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Inspection Registry & History" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Package Inspection History & Search
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Authoritative statutory inspection history, search, and compliance filtering under Legal Metrology Rules, 2011.
              </p>
            </div>

            <Link href="/inspections/new">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                Initiate New Inspection
              </Button>
            </Link>
          </div>

          {/* Search & Multi-Filter Control Panel */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Product Name, Inspection ID, or Location..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Compliance Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLIANT">Compliant Only</option>
                  <option value="NON_COMPLIANT">Non-Compliant</option>
                  <option value="REQUIRES_REVIEW">Requires Review</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inspection History Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Inspection ID</th>
                    <th className="px-6 py-3.5">Commodity / Product</th>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Inspection Hub</th>
                    <th className="px-6 py-3.5">Compliance Status</th>
                    <th className="px-6 py-3.5 text-center">Score</th>
                    <th className="px-6 py-3.5 text-center">Violations</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredScans.length > 0 ? (
                    filteredScans.map((scan) => {
                      const productName =
                        scan.analysis?.declarations?.generic_name?.value ||
                        scan.productName ||
                        "Packaged Commodity";
                      const violationsCount = scan.analysis?.violations?.length || 0;

                      return (
                        <tr
                          key={scan.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 font-mono text-slate-900 font-semibold">
                            <Link href={`/inspections/${scan.id}`} className="hover:underline text-blue-600">
                              {scan.scanNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{productName}</div>
                            <div className="text-[11px] text-slate-400">
                              {scan.analysis?.classification?.category || "General Commodity"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(scan.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {scan.location || "Central Zonal Hub"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={scan.complianceStatus || "REQUIRES_REVIEW"}
                              size="sm"
                            />
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-800">
                            {scan.complianceScore != null
                              ? `${scan.complianceScore}%`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {violationsCount > 0 ? (
                              <span className="px-2 py-0.5 bg-red-50 text-red-700 font-bold rounded border border-red-200">
                                {violationsCount} Violation{violationsCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded border border-emerald-200">
                                0
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/inspections/${scan.id}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Eye className="w-3.5 h-3.5" />}
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
                        colSpan={8}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No matching inspection history records found.
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
