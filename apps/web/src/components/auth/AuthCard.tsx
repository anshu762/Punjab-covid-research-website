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

  async function handleDemoLogin() {
    setDemoLoading(true);
    setErrorMessage(null);
    try {
      await startDemoSession();
    } catch (e: unknown) {
      if (e && typeof e === "object" && "digest" in e) {
        throw e;
      }
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to launch demo session. Please try again."
      );
      setDemoLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-3xl bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 text-ink">
      {/* Left Column: Brand Context & Research Highlights (Landscape rectangle side) */}
      <div className="relative bg-gradient-to-br from-[#0B1F3A] via-[#12294A] to-[#0B1F3A] text-white p-6 sm:p-7 flex flex-col justify-between overflow-hidden md:col-span-5 border-b md:border-b-0 md:border-r border-border/20">
        {/* Ambient decorative glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-[11px] font-mono text-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Punjab COVID-19</span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M3 12h4l3 8 4-16 3 8h4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">EpiLens</h2>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Epidemiology workbench for compartmental SIR models, forecast evaluation, and reproducible science.
            </p>
          </div>

          {/* Research feature highlights */}
          <div className="pt-2 space-y-2.5 hidden sm:block">
            <div className="flex items-start gap-2.5 text-xs text-slate-200">
              <Activity className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Dual SIR Models</span>
                <p className="text-[11px] text-slate-400">Scipy RK45 ODE solver with constant & change-point &tau;.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-200">
              <BarChart2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Empirical Baselines</span>
                <p className="text-[11px] text-slate-400">7-day rolling trailing mean & coverage strip evaluation.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Deterministic & Isolated</span>
                <p className="text-[11px] text-slate-400">Owner-isolated sessions with CSV & audit exports.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-4 mt-4 border-t border-white/10 hidden md:block">
          <p className="text-[11px] text-slate-400 font-mono">
            Open Science &bull; Punjab 2020&ndash;2021
          </p>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between bg-surface relative">
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer z-20"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div>
          {/* Segmented Mode Switcher */}
          <div className="p-1 bg-surface-2 border border-border rounded-xl flex items-center relative mb-4">
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

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-danger rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
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
                  className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink flex items-center justify-between">
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
                  className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || demoLoading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Sign In to Workspace
              </button>
            </form>
          )}

          {/* Sign Up Form - 2 Columns on desktop for sleek rectangle layout */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Harpreet Kaur"
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="harpreet@punjab.edu"
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink flex items-center justify-between">
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
                    className="w-full text-xs rounded-xl border border-border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink flex items-center justify-between">
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
                    className={`w-full text-xs rounded-xl border px-3.5 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 transition ${
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
                className="w-full mt-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Researcher Account
              </button>
            </form>
          )}

          {/* Switch mode link */}
          <div className="text-center pt-2">
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

        {/* Instant Demo Session */}
        <div className="pt-3 border-t border-border mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted font-medium">Quick Preview:</span>
            <button
              type="button"
              disabled={isLoading || demoLoading}
              onClick={handleDemoLogin}
              className="py-1.5 px-3 bg-surface-2 hover:bg-slate-200/70 text-ink border border-border rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {demoLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Launch Guest Demo Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
