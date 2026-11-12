"use client";

import React, { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Activity,
  BarChart2,
  ShieldCheck,
} from "lucide-react";
import { loginWithCredentials, signUpUser, startDemoSession } from "@/actions/auth";

export interface AuthCardProps {
  initialMode?: "signin" | "signup";
  onClose?: () => void;
  isModal?: boolean;
}

export function AuthCard({ initialMode = "signin", onClose, isModal = false }: AuthCardProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginWithCredentials({ email, password });
      if (res?.error) {
        setErrorMessage(res.error);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) {
        throw err;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Invalid email or password. Please verify your credentials."
      );
      setIsLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage("Password must contain at least one number");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpUser({
        name,
        email,
        password,
        confirmPassword,
      });

      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      // Automatically sign in upon registration
      const loginRes = await loginWithCredentials({ email, password });
      if (loginRes?.error) {
        setSuccessMessage("Account created successfully! Please sign in with your credentials.");
        setMode("signin");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) {
        throw err;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create account. Please try again."
      );
      setIsLoading(false);
    }
  }

  const [warmingUp, setWarmingUp] = useState(false);

  async function handleDemoLogin() {
    setDemoLoading(true);
    setWarmingUp(false);
    setErrorMessage(null);

    const warmTimer = setTimeout(() => {
      setWarmingUp(true);
    }, 1800);

    try {
      await startDemoSession();
    } catch (e: unknown) {
      clearTimeout(warmTimer);
      if (e && typeof e === "object" && "digest" in e) {
        throw e;
      }
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to launch demo session. Please try again."
      );
      setDemoLoading(false);
      setWarmingUp(false);
    }
  }

  return (
    <div className="relative w-full max-w-3xl bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 text-ink">
      {/* Left Column: Brand Context & Research Highlights (Landscape rectangle side) */}
      <div className="relative bg-navy-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-navy-900 to-slate-950 text-white p-6 sm:p-7 flex flex-col justify-between overflow-hidden md:col-span-5 border-b md:border-b-0 md:border-r border-white/10">
        {/* Ambient high-tech background effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-60" />
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Micro status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/25 backdrop-blur-md shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-200">
              Punjab COVID-19
            </span>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-navy-900 border border-blue-300/40 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M3 12h4l3 8 4-16 3 8h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                EpiLens
              </h2>
            </div>
            <p className="mt-2.5 text-xs text-slate-300/90 leading-relaxed font-normal">
              Epidemiology workbench for compartmental SIR models, forecast evaluation, and reproducible science.
            </p>
          </div>

          {/* Research feature cards */}
          <div className="pt-1.5 space-y-2.5 hidden sm:block">
            {/* Feature 1 */}
            <div className="group p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-blue-400/30 transition-all duration-200 backdrop-blur-xs flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.2)] mt-0.5">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white tracking-tight">Dual SIR Models</span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/25">M1 / M2</span>
                </div>
                <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                  Scipy RK45 ODE solver with constant &amp; change-point &tau;.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-cyan-400/30 transition-all duration-200 backdrop-blur-xs flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.2)] mt-0.5">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white tracking-tight">Empirical Baselines</span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/25">ROLLING 7D</span>
                </div>
                <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                  7-day rolling trailing mean &amp; coverage strip evaluation.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-400/30 transition-all duration-200 backdrop-blur-xs flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)] mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white tracking-tight">Deterministic &amp; Isolated</span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/25">ISOLATED</span>
                </div>
                <p className="text-[11px] text-slate-300/85 leading-snug mt-0.5">
                  Owner-isolated sessions with CSV &amp; audit exports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer tag of left panel */}
        <div className="relative z-10 pt-3 mt-4 border-t border-white/10 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"></span>
            <span>Open Science &bull; Punjab 2020&ndash;2021</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10">v1.0 LTS</span>
        </div>
      </div>

      {/* Right Column: Form Area with Perfectly Distributed Spacing */}
      <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between bg-surface relative">
        {/* Top Header Row: Segmented Switch + Close Button (Never overlaps!) */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-5">
            {/* Segmented Mode Switcher */}
            <div className="p-1 bg-surface-2 border border-border rounded-xl flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  mode === "signin"
                    ? "text-ink bg-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  mode === "signup"
                    ? "text-ink bg-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Dedicated Close Button if Modal: Sits neatly in the top row */}
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-100 border border-transparent hover:border-border transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form with balanced vertical padding */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@university.edu"
                  className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted" />
                    Password
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-[11px] text-muted hover:text-ink flex items-center gap-1 font-normal cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || demoLoading}
                className="w-full mt-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Sign In to Workspace
              </button>
            </form>
          )}

          {/* Sign Up Form - 2 Columns on desktop with comfortable spacing */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Harpreet Kaur"
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="harpreet@punjab.edu"
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted" />
                      Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-[11px] text-muted hover:text-ink flex items-center gap-1 font-normal cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 num"
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted" />
                      Confirm
                    </span>
                    {confirmPassword && password === confirmPassword && (
                      <span className="text-[11px] text-success flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Match
                      </span>
                    )}
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full text-xs rounded-xl border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 transition shadow-2xs ${
                      confirmPassword && password !== confirmPassword
                        ? "border-danger focus:ring-red-500"
                        : "border-border focus:ring-blue-600"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || demoLoading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Researcher Account
              </button>
            </form>
          )}

          {/* Switch mode link */}
          <div className="text-center pt-3">
            {mode === "signin" ? (
              <p className="text-xs text-muted">
                New to EpiLens?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Bottom Instant Demo Session: Cleanly anchored with full-width button */}
        <div className="pt-4 border-t border-border mt-5">
          <button
            type="button"
            disabled={isLoading || demoLoading}
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-4 bg-surface-2 hover:bg-slate-100 text-ink border border-border rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{warmingUp ? "Warming up analysis engine..." : "Setting up guest session..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Explore as Guest Demo User (No Registration)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
