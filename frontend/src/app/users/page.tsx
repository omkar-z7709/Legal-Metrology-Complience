"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserPlus, UserX, Shield, Lock, AlertCircle, CheckCircle2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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

  const fetchUsers = async () => {
    const token = localStorage.getItem("lm_auth_token");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data.users) {
        setUsers(data.data.users);
      } else if (res.status === 403) {
        setActionError("Access Restricted: Only Admin officers can manage enforcement accounts.");
      }
    } catch (err) {
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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Officer User Management & RBAC" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Enforcement Personnel & RBAC Registry
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Admin-controlled role assignments and Supabase Auth account lifecycle management.
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Add Authorized Inspector
              </Button>
            )}
          </div>

          {actionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError("")} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess("")} className="text-emerald-600 hover:text-emerald-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Officer Name & Email</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Department Division</th>
                    <th className="px-6 py-3.5">Account Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4 text-slate-600">
                          {u.department || "Enforcement Directorate"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              u.isActive !== false
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {u.isActive !== false ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && u.role === "INSPECTOR" && u.isActive !== false && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeactivateInspector(u.id, u.email)}
                              icon={<UserX className="w-3.5 h-3.5 text-red-500" />}
                            >
                              Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        {loading ? "Loading enforcement personnel records..." : "No user records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* Add Inspector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#12304A]">Add Authorized Inspector</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInspector} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspector Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Officer Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#12304A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="inspector@lm.gov.in"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#12304A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Department / Branch</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#12304A]"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700">
                <Shield className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                Role will be server-assigned as <strong>INSPECTOR</strong>. The officer will be forced to change their password on first login.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={submitting}>
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
