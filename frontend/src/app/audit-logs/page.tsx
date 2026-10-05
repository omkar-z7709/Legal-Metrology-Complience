"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { History, Shield, Filter, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useCachedApi } from "@/lib/cache";

export default function AuditLogsPage() {
  const { data: logsData, loading } = useCachedApi(
    `${API_BASE_URL}/api/audit-logs`,
    { headers: { authorization: "Bearer dev-inspector" } },
    60000
  );

  const logs = logsData?.data?.logs || [];

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
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Statutory Audit Trail" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Audit System</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Statutory Audit Trail
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Immutable log of officer determinations, manual overrides, and report generation.
              </p>
            </div>
          </header>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-5 py-3">Timestamp</th>
                    <th scope="col" className="px-5 py-3">Officer / User</th>
                    <th scope="col" className="px-5 py-3">Action Event</th>
                    <th scope="col" className="px-5 py-3">Target Resource</th>
                    <th scope="col" className="px-5 py-3">Audit Details & Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sampleLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{log.userEmail}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                            log.action?.includes("OVERRIDDEN")
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : log.action?.includes("REPORT")
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {log.resourceType}: {log.resourceId}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {log.details?.notes || JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards for Table */}
              <div className="flex flex-col divide-y divide-slate-100 md:hidden">
                {sampleLogs.map((log: any) => (
                  <div key={log.id} className="flex flex-col gap-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-900">{log.userEmail}</span>
                      <span
                        className={`shrink-0 inline-flex rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                          log.action?.includes("OVERRIDDEN")
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : log.action?.includes("REPORT")
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {log.action}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                    </div>
                    <div className="rounded bg-slate-50 p-2 font-mono text-xs text-slate-700 border border-slate-100">
                      <span className="font-semibold">{log.resourceType}:</span> {log.resourceId}
                    </div>
                    {(log.details?.notes || Object.keys(log.details || {}).length > 0) && (
                      <div className="text-xs text-slate-600">
                        <strong className="font-medium text-slate-800">Details:</strong>{" "}
                        {log.details?.notes || JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
