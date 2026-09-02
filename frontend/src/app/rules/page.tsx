"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { BookOpen, Search, ShieldCheck, Scale, ExternalLink } from "lucide-react";

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

  const filteredRules = statutoryRules.filter(
    (r) =>
      r.ruleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requirement.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Rule Knowledge Base" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Statutory Rule Knowledge Base
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Official Legal Metrology (Packaged Commodities) Rules, 2011 and statutory Gazette amendments.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search statutory rules by keyword or clause..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800 shadow-2xs"
            />
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader
                  title={
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                        {rule.ruleNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{rule.title}</span>
                    </div>
                  }
                  action={
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      {rule.severity}
                    </span>
                  }
                />
                <CardBody className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                      Statutory Requirement
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">{rule.requirement}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 space-y-0.5">
                    <div><strong>Act / Rules:</strong> {rule.act}</div>
                    <div><strong>Citation:</strong> {rule.clause}</div>
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
