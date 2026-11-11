"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail, User, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { signUpUser, loginWithCredentials, startDemoSession } from "@/actions/auth";
import { InlineError } from "@/components/common/InlineError";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick checks
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
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create account
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

      // 2. Automatically log in upon successful registration
      const loginRes = await loginWithCredentials({ email, password });
      if (loginRes?.error) {
        // Redirect to login page with notice if auto-login didn't redirect
        router.push("/login?registered=true");
      }
    } catch (err: unknown) {
      // Allow Next.js redirect to pass through
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
      setErrorMessage("Failed to start demo session");
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col justify-center items-center p-4">
      {/* Return to Landing Page */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to homepage
        </Link>
      </div>

      <div className="w-full max-w-md p-8 bg-surface rounded-[14px] border border-border shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xs font-bold text-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Create an Account</h1>
          <p className="text-xs text-muted">EpiLens &middot; Punjab COVID-19 Research Workbench</p>
        </div>

        {errorMessage && <InlineError message={errorMessage} className="w-full justify-center" />}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
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
              className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          {/* Email Address */}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters with 1 number"
              className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
            <span className="text-[11px] text-muted block">Min. 8 characters, must include at least one number</span>
          </div>

          {/* Confirm Password */}
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
              placeholder="Re-enter your password"
              className={`w-full text-xs rounded-lg border px-3 py-2 bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 transition ${
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
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Researcher Account
          </button>
        </form>

        {/* Existing account link */}
        <div className="text-center pt-1 border-t border-border">
          <p className="text-xs text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>

        {/* Guest Demo Account Alternative */}
        <div className="pt-2">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-muted font-medium">or try instantly</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading || demoLoading}
            className="w-full mt-2 py-2.5 px-4 bg-surface-2 hover:bg-slate-200/70 text-ink border border-border rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Explore as Guest Demo User
          </button>
        </div>
      </div>
    </div>
  );
}
