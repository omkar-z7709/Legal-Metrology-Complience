"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  KeyRound,
  X
} from "lucide-react";
import { useSidebarStore } from "@/lib/store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { isOpen, setIsOpen } = useSidebarStore();

  useEffect(() => {
    const stored = localStorage.getItem("lm_auth_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {}
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("lm_auth_token");
    localStorage.removeItem("lm_auth_user");
    router.push("/login");
  };

  const mainNav: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "New Inspection", href: "/inspections/new", icon: ScanSearch, badge: "ACTION" },
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
      <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? "bg-[var(--navy-primary)] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-blue-300" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span className="tracking-wide leading-none pt-0.5">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-sm ${isActive ? 'bg-blue-900/50 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  const officerName = currentUser?.name || "Enforcement Officer";
  const officerRole = currentUser?.role || "INSPECTOR";
  const initials = officerName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const SidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto w-full no-scrollbar">
        <div className="p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[var(--navy-primary)] text-white rounded-md shadow-sm">
              <Shield className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="text-[13px] font-bold tracking-widest text-[var(--navy-primary)] leading-tight">
                LEGAL METROLOGY
              </div>
              <div className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Compliance System
              </div>
            </div>
          </div>
          <button
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pb-8">
          {renderNavGroup("Main", mainNav)}
          {renderNavGroup("Intelligence", intelligenceNav)}
          {renderNavGroup("Administration", adminNav)}
        </div>
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <div className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200 shadow-sm transition-colors hover:border-slate-300">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-[var(--navy-primary)] text-white flex items-center justify-center text-[11px] font-bold shrink-0 tracking-wider">
              {mounted ? initials : "..."}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-[12px] font-semibold text-slate-900 leading-tight truncate">
                {mounted ? officerName : "Loading..."}
              </div>
              <div className="text-[9px] font-medium text-slate-500 truncate uppercase tracking-wide">
                {mounted ? `${officerRole} • DEPT OF LM` : "..."}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-0.5">
            <Link
              href="/change-password"
              title="Change Password"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-sm transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {SidebarContent}
      </aside>
    </>
  );
}
