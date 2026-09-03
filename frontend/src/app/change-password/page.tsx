"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation password do not match.");
      return;
    }

    const token = localStorage.getItem("lm_auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update password.");
      }

      setSuccessMsg("Password updated successfully! Redirecting to dashboard...");
      
      // Update local storage user flags
      const storedUser = localStorage.getItem("lm_auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.mustChangePassword = false;
        localStorage.setItem("lm_auth_user", JSON.stringify(parsed));
      }

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E293B] border border-amber-500/30 shadow-xl">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            PASSWORD UPDATE REQUIRED
          </h2>
          <p className="text-xs text-amber-300 font-medium tracking-wide uppercase mt-1">
            First Login Security Enforcement — Legal Metrology Division
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1E293B] py-8 px-6 shadow-2xl border border-slate-800 sm:rounded-xl sm:px-10 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100">Set New Account Password</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              As an authorized officer, you must change your initial temporary password before proceeding.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  Update Password & Enter Portal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
