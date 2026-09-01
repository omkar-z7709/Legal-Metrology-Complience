"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  Shield,
  Lock,
  Mail,
  AlertOctagon,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Scale,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide both your official email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(
        err.message || "Failed to authenticate. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const setTestAccount = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Government Header Strip */}
      <header className="border-b border-slate-800 bg-[#0B1120]/80 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/40 border border-blue-700/50 rounded-lg text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Legal Metrology Enforcement Directorate
              </div>
              <div className="text-[11px] text-slate-400">
                Department of Consumer Affairs • Government of India
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Official Portal (Strict Role Authorization)</span>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          {/* Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Top Accent Light */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

            {/* Title Section */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex p-3 bg-blue-950/60 border border-blue-800/40 rounded-xl text-blue-400 mb-2">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Authorized Officer Sign In
              </h1>
              <p className="text-xs text-slate-400">
                Sign in using your approved government credentials to access compliance screening & enforcement tools.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-red-200">
                    Authentication Error
                  </strong>
                  {error}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer.name@lm.gov.in"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Access Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Test Accounts Quick Helper */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Test Officer Accounts
                </span>
                <span className="text-[10px] text-slate-500">Click to fill</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setTestAccount("test.inspector@lm.gov.in", "InspectorPass2026!")
                  }
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-blue-400">Inspector</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    test.inspector@lm.gov.in
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTestAccount("test.supervisor@lm.gov.in", "SupervisorPass2026!")
                  }
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-purple-400">Supervisor</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    test.supervisor@lm.gov.in
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTestAccount("test.admin@lm.gov.in", "AdminPass2026!")
                  }
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-amber-400">Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    test.admin@lm.gov.in
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTestAccount("inactive.officer@lm.gov.in", "InactivePass2026!")
                  }
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-red-400">Inactive (403)</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    inactive.officer@lm.gov.in
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-center text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              Restricted to authorized enforcement officers only.
            </p>
            <p>
              Unauthorized access attempts are audited and logged pursuant to the Information Technology Act.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-3 text-center text-[11px] text-slate-500 bg-[#0B1120]/50">
        Legal Metrology (Packaged Commodities) Rules, 2011 Automated Inspection System • SIH Prototype
      </footer>
    </div>
  );
}
