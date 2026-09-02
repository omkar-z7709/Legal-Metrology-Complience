"use client";

import React from "react";
import { Bell, HelpCircle, ChevronRight, ShieldCheck, Database, RefreshCw } from "lucide-react";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({
  breadcrumbs = [{ label: "Dashboard" }],
  onRefresh,
  isRefreshing = false,
}: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-400 font-medium">Portal</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              className={`font-medium ${
                idx === breadcrumbs.length - 1
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-700 cursor-pointer"
              }`}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right: Actions, Diagnostics, Profile */}
      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200" />

        <button
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        <button
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Legal Metrology Rules Reference & Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Official Designation Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Govt. Enforcement Portal (Live)</span>
        </div>
      </div>
    </header>
  );
}
