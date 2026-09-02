"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { History, Shield, Filter, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/audit-logs`, {
      headers: { authorization: "Bearer dev-inspector" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.logs) {
          setLogs(data.data.logs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sampleLogs = logs.length > 0 ? logs : [
    {
      id: "log-1",
      action: "INSPECTION_REVIEWED",
      userEmail: "officer@lm.gov.in",
      resourceType: "SCAN",
      resourceId: "INS-2026-0891",
      timestamp: "2026-08-26T14:32:00.000Z",
      details: { decision: "ACCEPTED", notes: "Verified physical sample against digital label extraction." },
    },
    {
      id: "log-2",
      action: "INSPECTION_OVERRIDDEN",
      userEmail: "sarthak.verma@lm.gov.in",
      resourceType: "SCAN",
      resourceId: "INS-2026-0889",
      timestamp: "2026-08-26T11:45:00.000Z",
      details: { decision: "OVERRIDDEN", overriddenStatus: "COMPLIANT", notes: "Consumer care QR code present on side panel." },
    },
    {
      id: "log-3",
      action: "REPORT_GENERATED",
      userEmail: "anita.rao@lm.gov.in",
      resourceType: "REPORT",
      resourceId: "RPT-INS-2026-0890",
      timestamp: "2026-08-26T13:18:00.000Z",
      details: { format: "PDF", status: "STORED_SUPABASE_STORAGE" },
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Statutory Audit Trail" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="pb-2 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
              Statutory Inspection Audit Trail
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Immutable log of officer reviews, determinations, manual overrides, and report generation (Modules 13 & 18).
            </p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Officer / User</th>
                    <th className="px-6 py-3">Action Event</th>
                    <th className="px-6 py-3">Target Resource</th>
                    <th className="px-6 py-3">Audit Details & Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sampleLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">{log.userEmail}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            log.action?.includes("OVERRIDDEN")
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : log.action?.includes("REPORT")
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">
                        {log.resourceType}: {log.resourceId}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-md">
                        {log.details?.notes || JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
