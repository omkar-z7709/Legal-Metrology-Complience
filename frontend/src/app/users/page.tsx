"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserPlus, UserX, Shield, Lock, AlertCircle, CheckCircle2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { fetchWithCache, clearApiCache } from "@/lib/cache";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modal Form State
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("Legal Metrology Zonal Enforcement");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lm_auth_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {}
    }

    fetchUsers();
  }, []);

  const fetchUsers = async (forceFresh = false) => {
    const token = localStorage.getItem("lm_auth_token") || "dev-inspector";
    setLoading(true);

    try {
      const data = await fetchWithCache(
        `${API_BASE_URL}/api/admin/users`,
        { headers: { Authorization: `Bearer ${token}` } },
        forceFresh ? 0 : 60000
      );
      if (data?.success && data?.data?.users) {
        setUsers(data.data.users);
      }
    } catch (err: any) {
      if (err.message?.includes("403")) {
        setActionError("Access Restricted: Only Admin officers can manage enforcement accounts.");
      }
      console.error("[ADMIN] Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!newEmail || !newName) {
      setActionError("Please provide both officer email and name.");
      return;
    }

    const token = localStorage.getItem("lm_auth_token");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          department: newDept,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create Inspector account.");
      }

      setActionSuccess(`Inspector account created for ${newEmail}. Initial password: ${data.data.initialPassword}`);
      setShowAddModal(false);
      setNewEmail("");
      setNewName("");
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || "Could not add Inspector.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateInspector = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to deactivate Inspector account for ${email}?`)) {
      return;
    }

    setActionError("");
    setActionSuccess("");
    const token = localStorage.getItem("lm_auth_token");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to deactivate Inspector.");
      }

      setActionSuccess(`Inspector ${email} deactivated successfully.`);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || "Deactivation failed.");
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Officer User Management & RBAC" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Admin</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Enforcement Personnel
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Role assignments and account lifecycle management.
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
              >
                Add Inspector
              </Button>
            )}
          </header>

          {actionError && (
            <div className="flex items-center justify-between rounded border-l-4 border-l-red-600 border-y-red-200 border-r-red-200 bg-red-50 p-4 text-sm text-red-900 border-y border-r">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{actionError}</span>
              </div>
              <button type="button" onClick={() => setActionError("")} className="text-red-600 hover:text-red-800 focus:outline-none">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="flex items-center justify-between rounded border-l-4 border-l-emerald-600 border-y-emerald-200 border-r-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 border-y border-r">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{actionSuccess}</span>
              </div>
              <button type="button" onClick={() => setActionSuccess("")} className="text-emerald-700 hover:text-emerald-900 focus:outline-none">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">Officer Name & Email</th>
                      <th scope="col" className="px-5 py-3">Role</th>
                      <th scope="col" className="px-5 py-3">Department Division</th>
                      <th scope="col" className="px-5 py-3">Status</th>
                      <th scope="col" className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                u.role === "ADMIN"
                                  ? "border-purple-200 bg-purple-50 text-purple-800"
                                  : u.role === "SUPERVISOR"
                                  ? "border-blue-200 bg-blue-50 text-blue-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {u.department || "Enforcement Directorate"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                                u.isActive !== false
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {u.isActive !== false ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isAdmin && u.role === "INSPECTOR" && u.isActive !== false && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDeactivateInspector(u.id, u.email)}
                                icon={<UserX className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />}
                              >
                                Deactivate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                          {loading ? "Loading enforcement personnel records..." : "No user records found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {users.length > 0 ? (
                users.map((u) => (
                  <Card key={u.id}>
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="text-sm text-slate-500">{u.email}</div>
                        </div>
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === "ADMIN"
                              ? "border-purple-200 bg-purple-50 text-purple-800"
                              : u.role === "SUPERVISOR"
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600">
                        {u.department || "Enforcement Directorate"}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                            u.isActive !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {u.isActive !== false ? "ACTIVE" : "INACTIVE"}
                        </span>

                        {isAdmin && u.role === "INSPECTOR" && u.isActive !== false && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeactivateInspector(u.id, u.email)}
                            icon={<UserX className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card>
                  <div className="p-6 text-center text-sm text-slate-500">
                    {loading ? "Loading enforcement personnel records..." : "No user records found."}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Inspector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-xl border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-semibold tracking-tight text-[#12304A]">Add Authorized Inspector</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#12304A]">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddInspector} className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block font-semibold text-slate-800">Inspector Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Officer Ramesh Kumar"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-800">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="inspector@lm.gov.in"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-800">Assigned Department / Branch</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
                />
              </div>

              <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <Shield className="mr-1 inline h-4 w-4 text-blue-600" aria-hidden="true" />
                Role will be server-assigned as <strong className="font-semibold text-blue-900">INSPECTOR</strong>. The officer will be forced to change their password on first login.
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-3">
                <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={submitting}>
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
