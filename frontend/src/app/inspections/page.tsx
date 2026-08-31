"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ScanSearch, Filter, Eye, FileText, Search, Plus } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function InspectionsListPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

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
      .catch(() => {});
  }, []);

  const filteredScans = scans.filter((s) => {
    const matchesSearch =
      s.scanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "ALL" || s.complianceStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (filteredScans.length < 1) {
          return (
            <div className="flex min-h-screen bg-[#F8FAFC]">
              <Sidebar />
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Loading inspection records...
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
        <TopBar breadcrumbs={[{ label: "Inspections Registry" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Package Inspections Registry
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Official registry of packaged commodities inspected under Legal
                Metrology Rules, 2011.
              </p>
            </div>

            <Link href="/inspections/new">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                New Inspection
              </Button>
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Scan ID or Location..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
              />
            </div>


            <div className="flex items-center gap-2 text-xs w-full md:w-auto">
              <span className="text-slate-500 font-medium">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800"
              >
                <option value="ALL">All Inspections</option>
                <option value="COMPLIANT">Compliant Only</option>
                <option value="NON_COMPLIANT">Non-Compliant</option>
                <option value="REQUIRES_REVIEW">Requires Review</option>
              </select>
            </div>
          </div>

          {/* Inspections Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Inspection ID</th>
                    <th className="px-6 py-3">Location Hub</th>
                    <th className="px-6 py-3">Date & Time</th>
                    <th className="px-6 py-3">Compliance Status</th>
                    <th className="px-6 py-3 text-center">Score</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredScans.length > 0 ? (
                    filteredScans.map((scan) => (
                      <tr
                        key={scan.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-3.5 font-mono text-slate-900 font-semibold">
                          {scan.scanNumber}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {scan.location || "Not specified"}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">
                          {new Date(scan.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge
                            status={scan.complianceStatus || "REQUIRES_REVIEW"}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          {scan.complianceScore != null
                            ? `${scan.complianceScore}%`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
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
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No inspection records matching query.
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
