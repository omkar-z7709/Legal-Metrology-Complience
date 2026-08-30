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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Compliance Analytics" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="pb-2 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
              Compliance Intelligence & Enforcement Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cross-category compliance metrics, violation frequency distributions, and longitudinal trends.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardBody className="p-6 text-center space-y-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Overall Screening Pass Rate</span>
                <div className="text-4xl font-extrabold text-emerald-700">65.9%</div>
                <p className="text-xs text-slate-400">Based on 1,248 total inspections</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-6 text-center space-y-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Most Frequent Infraction</span>
                <div className="text-xl font-bold text-red-700">Missing Mandatory Declaration</div>
                <p className="text-xs text-slate-400">Rule 6(1)(f) Consumer Care & (g) Origin</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-6 text-center space-y-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Officer Overrides</span>
                <div className="text-4xl font-extrabold text-[#12304A]">4.2%</div>
                <p className="text-xs text-slate-400">52 manual determinations logged</p>
              </CardBody>
            </Card>
          </div>

          {/* Category Performance Breakdown */}
          <Card>
            <CardHeader
              title="Commodity Category Compliance Rates"
              description="Breakdown of inspection pass vs violation rates by product sector"
            />
            <CardBody className="space-y-5">
              {categoryStats.map((item, idx) => (
                <div key={idx} className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{item.category}</span>
                    <span className="text-slate-500 font-medium">
                      {item.compliant} Pass / {item.nonCompliant} Fail ({item.rate}% Compliant)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-600 rounded-l-full" style={{ width: `${item.rate}%` }} />
                    <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${100 - item.rate}%` }} />
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
