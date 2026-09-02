"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Shield, Lock, CheckCircle2, UserPlus } from "lucide-react";
import { API_BASE_URL, authFetch } from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.users) {
          setUsers(data.data.users);
        }
      })
      .catch(() => {});
  }, []);

  const userList = users.length > 0 ? users : [
    {
      id: "usr-01",
      name: "Sarthak Verma",
      email: "sarthak.verma@lm.gov.in",
      role: "INSPECTOR",
      department: "Zonal Enforcement Branch",
      permissions: ["upload scan", "view own scans", "generate reports"],
    },
    {
      id: "usr-02",
      name: "Anita Rao",
      email: "anita.rao@lm.gov.in",
      role: "SUPERVISOR",
      department: "Regional Directorate",
      permissions: ["review inspections", "verify/escalate", "approve reports"],
    },
    {
      id: "usr-03",
      name: "Dr. Rajesh Kumar",
      email: "rajesh.kumar@lm.gov.in",
      role: "ADMIN",
      department: "Legal Metrology Directorate HQ",
      permissions: ["manage users", "manage rules", "system settings", "audit logs"],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Users & Role Permissions" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Enforcement Personnel & RBAC Hierarchy
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Role-based access control (INSPECTOR, SUPERVISOR, ADMIN) enforced at Fastify middleware (Module 2).
              </p>
            </div>

            <Button variant="primary" icon={<UserPlus className="w-4 h-4" />}>
              Add Authorized Officer
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Officer Name & Email</th>
                    <th className="px-6 py-3">Assigned Role</th>
                    <th className="px-6 py-3">Department Division</th>
                    <th className="px-6 py-3">Fastify Middleware Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {userList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : u.role === "SUPERVISOR"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{u.department || "Enforcement Wing"}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(u.permissions || ["upload scan", "view scans", "generate reports"]).map((p: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              {p}
                            </span>
                          ))}
                        </div>
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
