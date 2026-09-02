"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  ScanSearch,
  ListChecks,
  Package,
  FileText,
  BarChart3,
  BookOpen,
  Users,
  History,
  Settings,
  Shield,
  LogOut,
  UserCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  const mainNav: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "New Inspection", href: "/inspections/new", icon: ScanSearch, badge: "Action" },
    { label: "Inspections", href: "/inspections", icon: ListChecks },
    { label: "Products", href: "/products", icon: Package },
    { label: "Reports", href: "/reports", icon: FileText },
  ];

  const intelligenceNav: NavItem[] = [
    { label: "Compliance Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Rule Knowledge Base", href: "/rules", icon: BookOpen },
  ];

  const adminNav: NavItem[] = [
    { label: "Users & Roles", href: "/users", icon: Users },
    { label: "Audit Logs", href: "/audit-logs", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-[#12304A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-300" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-800 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  const getInitials = (name?: string) => {
    if (!name) return "GO";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-amber-600";
      case "SUPERVISOR":
        return "bg-purple-600";
      case "INSPECTOR":
      default:
        return "bg-[#12304A]";
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      {/* Top Section */}
      <div>
        {/* Brand / Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-[#12304A] text-white rounded-lg">
            <Shield className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#12304A]">
              Legal Metrology
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Compliance Intelligence
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="p-3">
          {renderNavGroup("Main", mainNav)}
          {renderNavGroup("Intelligence", intelligenceNav)}
          {renderNavGroup("Administration", adminNav)}
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 shrink-0 rounded-full text-white flex items-center justify-center text-xs font-bold ${getRoleBadgeColor(
                user?.role,
              )}`}
            >
              {getInitials(user?.name)}
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
                {user?.name || (isAuthenticated ? "Official Officer" : "Guest Officer")}
              </div>
              <div className="text-[10px] font-medium text-slate-500 truncate">
                {user?.role || "INSPECTOR"} • {user?.department || "Legal Metrology"}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out of portal"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
