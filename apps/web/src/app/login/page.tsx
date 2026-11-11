"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import React, { Suspense, useState } from "react";
import { loginWithCredentials, startDemoSession } from "@/actions/auth";
import { InlineError } from "@/components/common/InlineError";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const registeredParam = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam ? `Authentication error: ${errorParam}` : null
  );

  async function handleLogin(e: React.FormEvent) {
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
      // Next.js redirect errors MUST be allowed to propagate to navigate the browser
      if (err && typeof err === "object" && "digest" in err) {
        throw err;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      );
      setIsLoading(false);
    }
  }

  async function handleStartDemo() {
    setDemoLoading(true);
    setErrorMessage(null);
    try {
      await startDemoSession();
    } catch (e: unknown) {
      if (e && typeof e === "object" && "digest" in e) {
        throw e;
      }
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to create demo session. Please try again."
      );
      setDemoLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md p-8 bg-surface rounded-[14px] border border-border shadow-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xs font-bold text-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M3 12h4l3 8 4-16 3 8h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in to EpiLens</h1>
        <p className="text-xs text-muted">Punjab COVID-19 Research Workbench &middot; Private Access</p>
      </div>

      {registeredParam && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Account created successfully! Please sign in with your credentials.</span>
        </div>
      )}

      {errorMessage && <InlineError message={errorMessage} className="w-full justify-center" />}

      {/* Email + Password Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
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
            className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted" />
              Password
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-[11px] text-muted hover:text-ink flex items-center gap-1 font-normal"
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
            className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || demoLoading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Sign In with Email
        </button>
      </form>

      {/* Sign Up Navigation Link */}
      <div className="text-center pt-1 border-t border-border">
        <p className="text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
            Create an account
          </Link>
        </p>
      </div>

      {/* Instant Demo Session Alternative */}
      <div className="pt-2">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-muted font-medium">or try instantly</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <button
          type="button"
          disabled={isLoading || demoLoading}
          onClick={handleStartDemo}
          className="w-full mt-2 py-2.5 px-4 bg-surface-2 hover:bg-slate-200/70 text-ink border border-border rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2"
        >
          {demoLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Demo Session...</span>
            </>
          ) : (
            <span>Explore with a Guest Demo Account</span>
          )}
        </button>
      </div>

      {/* Back to Landing Link */}
      <div className="text-center pt-2 border-t border-slate-100">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to public homepage</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-2 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
      <Suspense fallback={<div className="text-sm text-muted">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
