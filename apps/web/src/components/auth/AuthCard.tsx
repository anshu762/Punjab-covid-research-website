"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Sparkles, X } from "lucide-react";
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
    <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">
      {/* Top Header & Mode Switcher */}
      <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-blue-50/70 to-surface border-b border-border/60">
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink tracking-tight">EpiLens Access</h2>
            <p className="text-xs text-muted">Punjab COVID-19 Research Workbench</p>
          </div>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="mt-4 p-1 bg-surface-2 border border-border rounded-xl flex items-center relative">
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
      </div>

      {/* Form Content */}
      <div className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-danger rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3.5">
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
              Sign In
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
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
                placeholder="e.g. Dr. Harpreet Kaur"
                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters, at least 1 number"
                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted" />
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full text-xs rounded-xl border px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 transition ${
                  confirmPassword && password !== confirmPassword
                    ? "border-danger focus:ring-red-500"
                    : "border-border focus:ring-blue-600"
                }`}
              />
              {confirmPassword && password === confirmPassword && (
                <span className="text-[11px] text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </span>
              )}
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

        {/* Instant Demo Session */}
        <div className="pt-2">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="shrink mx-3 text-[10px] uppercase tracking-wider text-muted font-mono">
              or try without signup
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            disabled={isLoading || demoLoading}
            onClick={handleDemoLogin}
            className="w-full mt-1 py-2 px-3 bg-surface-2 hover:bg-slate-200/70 text-ink border border-border rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {demoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Explore as Guest Demo User</span>
          </button>
        </div>
      </div>
    </div>
  );
}
