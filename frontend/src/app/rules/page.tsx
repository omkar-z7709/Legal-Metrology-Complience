"use client";

import React, { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/useDebounce";

const statutoryRules = [
  {
    id: "RULE-6-1-A-NAME-ADDRESS",
    ruleNumber: "Rule 6(1)(a)",
    title: "Manufacturer / Packer / Importer Identity",
    category: "MANDATORY_DECLARATION",
    severity: "HIGH",
    requirement: "Name and complete physical address of the manufacturer or packer must be conspicuously stated on the label.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 6, Sub-rule (1), Clause (a)",
  },
  {
    id: "RULE-6-1-B-GENERIC-NAME",
    ruleNumber: "Rule 6(1)(b)",
    title: "Generic / Common Commodity Name",
    category: "MANDATORY_DECLARATION",
    severity: "HIGH",
    requirement: "Generic or common name of the commodity must appear on the Principal Display Panel.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 6, Sub-rule (1), Clause (b)",
  },
  {
    id: "RULE-6-1-C-NET-QUANTITY",
    ruleNumber: "Rule 6(1)(c)",
    title: "Net Quantity & Standard Measurement Units",
    category: "QUANTITY",
    severity: "CRITICAL",
    requirement: "Net quantity must use standard SI metric symbols (g, kg, ml, l, N) without non-standard imperial units.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 6, Sub-rule (1), Clause (c) read with Rule 11, 12, 13",
  },
  {
    id: "RULE-6-1-D-DATE-MANUFACTURE",
    ruleNumber: "Rule 6(1)(d)",
    title: "Month and Year of Manufacture / Packing",
    category: "DATE",
    severity: "HIGH",
    requirement: "Declaration of month and year of manufacture/packing must be formatted as MM/YYYY or Month YYYY.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 6, Sub-rule (1), Clause (d)",
  },
  {
    id: "RULE-6-1-E-MRP",
    ruleNumber: "Rule 6(1)(e)",
    title: "Maximum Retail Price (MRP) & Tax Inclusivity",
    category: "PRICING",
    severity: "CRITICAL",
    requirement: "Must state MRP clearly in Indian Rupees (₹ or Rs.) followed by 'incl. of all taxes'. Unit Sale Price required for packages > 1kg/1L.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011 (Amended 2022)",
    clause: "Rule 6, Sub-rule (1), Clause (e)",
  },
  {
    id: "RULE-6-1-F-CONSUMER-CARE",
    ruleNumber: "Rule 6(1)(f)",
    title: "Consumer Care Grievance Contact",
    category: "CONSUMER_PROTECTION",
    severity: "HIGH",
    requirement: "Must provide telephone number/helpline, email address, and physical contact address for consumer grievances.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 6, Sub-rule (1), Clause (f)",
  },
  {
    id: "RULE-6-1-G-COUNTRY-ORIGIN",
    ruleNumber: "Rule 6(1)(g)",
    title: "Country of Origin Declaration",
    category: "MANDATORY_DECLARATION",
    severity: "HIGH",
    requirement: "Country of Origin must be explicitly declared on Principal Display Panel.",
    act: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    clause: "Rule 6, Sub-rule (1), Clause (g)",
  },
  {
    id: "RULE-8-1-FONT-SIZE",
    ruleNumber: "Rule 8",
    title: "Minimum Height of Numerals & Letters",
    category: "VISUAL_STANDARDS",
    severity: "MEDIUM",
    requirement: "Font height must meet minimum thresholds based on package net quantity / Principal Display Panel area (Table 1).",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 8 read with Table 1 & Table 2",
  },
  {
    id: "RULE-9-1-READABILITY",
    ruleNumber: "Rule 9(1)",
    title: "Manner of Declaration & Contrast Readability",
    category: "VISUAL_STANDARDS",
    severity: "MEDIUM",
    requirement: "Declarations must be conspicuous, unambiguous, and present sufficient visual contrast against package background.",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    clause: "Rule 9, Sub-rule (1)",
  },
];

export default function RulesKnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeCategory, setActiveCategory] = useState("ALL");

  const categories = [
    { id: "ALL", label: "All Rules" },
    { id: "MANDATORY_DECLARATION", label: "Mandatory Declarations" },
    { id: "QUANTITY", label: "Quantity & Units" },
    { id: "DATE", label: "Date Formats" },
    { id: "PRICING", label: "Pricing & MRP" },
    { id: "VISUAL_STANDARDS", label: "Visual & Font Height" },
  ];

  const filteredRules = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return statutoryRules.filter((r) => {
      const matchesSearch =
        !term ||
        r.ruleNumber.toLowerCase().includes(term) ||
        r.title.toLowerCase().includes(term) ||
        r.requirement.toLowerCase().includes(term);

      const matchesCat =
        activeCategory === "ALL" || r.category === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [debouncedSearch, activeCategory]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Rule Knowledge Base" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Knowledge</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Statutory Rule Base
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Official Legal Metrology (Packaged Commodities) Rules, 2011 and statutory Gazette amendments.
              </p>
            </div>
          </header>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col gap-4 border border-slate-300 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search statutory rules by keyword or clause..."
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeCategory === cat.id
                      ? "bg-[#12304A] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-800">
                        {rule.ruleNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{rule.title}</span>
                    </div>
                  }
                  action={
                    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {rule.severity}
                    </span>
                  }
                />
                <CardBody className="space-y-4 text-sm">
                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Statutory Requirement
                    </span>
                    <p className="font-medium leading-relaxed text-slate-800">{rule.requirement}</p>
                  </div>

                  <div className="space-y-1 rounded bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                    <div><strong className="font-medium text-slate-900">Act / Rules:</strong> {rule.act}</div>
                    <div><strong className="font-medium text-slate-900">Citation:</strong> {rule.clause}</div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
