"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Download, Eye, ExternalLink } from "lucide-react";

export default function ReportsPage() {
  const sampleReports = [
    {
      id: "RPT-INS-2026-0891",
      product: "Fortified Sunflower Cooking Oil (1L)",
      date: "26 Aug 2026",
      status: "NON_COMPLIANT",
      inspector: "Officer Sarthak Verma",
    },
    {
      id: "RPT-INS-2026-0890",
      product: "Premium Instant Coffee Jar 200g",
      date: "26 Aug 2026",
      status: "COMPLIANT",
      inspector: "Officer Anita Rao",
    },
    {
      id: "RPT-INS-2026-0888",
      product: "Moisturizing Bath Soap 125g (Pack of 3)",
      date: "25 Aug 2026",
      status: "NON_COMPLIANT",
      inspector: "Officer Rajesh Kumar",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Statutory Reports" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="pb-2 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
              Generated Statutory Inspection Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Official PDF reports for regulatory notices under the Legal Metrology Act, 2009.
            </p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Report ID</th>
                    <th className="px-6 py-3">Commodity Sample</th>
                    <th className="px-6 py-3">Date Generated</th>
                    <th className="px-6 py-3">Inspector</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sampleReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">{r.id}</td>
                      <td className="px-6 py-3.5 font-medium">{r.product}</td>
                      <td className="px-6 py-3.5 text-slate-500">{r.date}</td>
                      <td className="px-6 py-3.5 text-slate-600">{r.inspector}</td>
                      <td className="px-6 py-3.5 text-right">
                        <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
                          Download PDF
                        </Button>
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
