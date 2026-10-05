"use client";

import React from "react";
import { Bell, HelpCircle, ChevronRight, RefreshCw, Menu } from "lucide-react";
import { useSidebarStore } from "@/lib/store";

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
  const { toggle } = useSidebarStore();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={toggle}
          className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Left: Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 tracking-widest uppercase">
          <span>PORTAL</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span
                className={`transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? "text-slate-900"
                    : "hover:text-slate-700 cursor-pointer"
                }`}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
        {/* Mobile active breadcrumb only */}
        <nav className="sm:hidden flex items-center text-xs font-semibold text-slate-900 tracking-wide">
          {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : "Portal"}
        </nav>
      </div>

      {/* Right: Actions, Diagnostics, Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50 border border-transparent hover:border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">Sync Data</span>
          </button>
        )}

        <div className="hidden md:block h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          <button
            className="hidden md:flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            title="Policy & Rule Reference"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden md:block h-4 w-px bg-slate-200" />

        {/* Official Designation Pill - Mobile Hidden */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-600 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative">
             <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25"></span>
          </span>
          SECURE PORTAL
        </div>
      </div>
    </header>
  );
}
