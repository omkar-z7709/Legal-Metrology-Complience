"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Lock, Mail, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter email address and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Invalid credentials or account deactivated.");
      }

      const { token, user } = data.data;

      // Save token and user details in storage
      localStorage.setItem("lm_auth_token", token);
      localStorage.setItem("lm_auth_user", JSON.stringify(user));

      // Check for first login forced password change
      if (user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate with Legal Metrology Server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E293B] border border-slate-700 shadow-xl">
          <Scale className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            LEGAL METROLOGY DIVISION
          </h2>
          <p className="text-xs text-blue-300 font-medium tracking-wide uppercase mt-1">
            Department of Consumer Affairs — Government of India
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1E293B] py-8 px-6 shadow-2xl border border-slate-800 sm:rounded-xl sm:px-10 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100">Official Portal Login</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your credentials to access statutory inspection tools.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@lm.gov.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Login to Portal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Authorized Legal Metrology Officers Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
