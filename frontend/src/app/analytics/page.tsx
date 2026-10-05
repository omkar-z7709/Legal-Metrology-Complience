"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { BarChart3, TrendingUp, ShieldCheck, AlertOctagon, CheckCircle2 } from "lucide-react";

export default function AnalyticsPage() {
  const categoryStats = [
    { category: "Edible Oils & Fats", total: 420, compliant: 280, nonCompliant: 140, rate: 67 },
    { category: "Packaged Food & Grains", total: 380, compliant: 290, nonCompliant: 90, rate: 76 },
    { category: "Cosmetics & Toiletries", total: 240, compliant: 130, nonCompliant: 110, rate: 54 },
    { category: "Spices & Condiments", total: 120, compliant: 85, nonCompliant: 35, rate: 71 },
    { category: "General Commodities", total: 88, compliant: 38, nonCompliant: 50, rate: 43 },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Analytics" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Enforcement operations</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Cross-category compliance metrics and violation frequency distributions.
              </p>
            </div>
          </header>

          <div
            role="status"
            className="border-l-4 border-blue-600 bg-blue-50 px-4 py-3 text-sm text-blue-900"
          >
            <strong>Note:</strong> Currently displaying sample operational data for demonstration. Live metrics will appear once backend aggregations are fully connected.
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardBody className="p-6 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Overall Assessment Pass Rate</span>
                <div className="mt-2 text-[40px] font-medium leading-none text-emerald-800">65.9%</div>
                <p className="mt-2 text-xs text-slate-500">Based on 1,248 total sample records</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex h-full flex-col justify-center p-6 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Most Frequent Infraction</span>
                <div className="mt-2 text-xl font-medium leading-tight text-red-800">Missing Mandatory Declaration</div>
                <p className="mt-2 text-xs text-slate-500">Rule 6(1)(f) Consumer Care & (g) Origin</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-6 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Officer Overrides</span>
                <div className="mt-2 text-[40px] font-medium leading-none text-[#12304A]">4.2%</div>
                <p className="mt-2 text-xs text-slate-500">52 manual determinations logged</p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Commodity Category Initial Assessment"
              description="Breakdown of automated assessment pass vs violation rates by product sector (sample dataset)"
            />
            <CardBody className="space-y-4">
              {categoryStats.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.category}</span>
                    <span className="text-slate-600">
                      {item.compliant} Pass / {item.nonCompliant} Fail ({item.rate}% Compliant)
                    </span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded bg-slate-100">
                    <div className="h-full bg-emerald-600" style={{ width: `${item.rate}%` }} />
                    <div className="h-full bg-red-600" style={{ width: `${100 - item.rate}%` }} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </main>
      </div>
    </div>
  );
}
