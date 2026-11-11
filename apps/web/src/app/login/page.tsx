"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Info } from "lucide-react";
import React, { Suspense, useState } from "react";
import { startDemoSession } from "@/auth";
import { InlineError } from "@/components/common/InlineError";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam ? `Authentication failed: ${errorParam}` : null
  );

  const googleConfigured = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ||
      process.env.AUTH_GOOGLE_ID
  );

  const handleStartDemo = async () => {
    setDemoLoading(true);
    setErrorMessage(null);
    try {
      await startDemoSession();
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to create demo session. Please try again."
      );
      setDemoLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-surface rounded-[14px] border border-border shadow-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xs font-bold text-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M3 12h4l3 8 4-16 3 8h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Sign in to EpiLens
        </h1>
        <p className="text-xs text-muted">
          Punjab COVID-19 Research Workbench &middot; Private Access
        </p>
      </div>

      {errorMessage && <InlineError message={errorMessage} className="w-full justify-center" />}

      <div className="space-y-4 pt-2">
        {/* Google Provider Button */}
        {googleConfigured ? (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/overview" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-border rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        ) : (
          <div className="relative group">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed"
            >
              <Info className="w-4 h-4 text-slate-400" />
              <span>Continue with Google</span>
            </button>
            <div className="text-[11px] text-center text-muted mt-1">
              Google OAuth keys unconfigured in dev environment. Use demo account below.
            </div>
          </div>
        )}

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative px-3 bg-surface text-xs text-muted uppercase font-mono">
            or
          </span>
        </div>

        {/* Demo Account Button */}
        <button
          type="button"
          disabled={demoLoading}
          onClick={handleStartDemo}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-xl shadow-md transition-all focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
        >
          {demoLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating Isolated Demo Session...</span>
            </>
          ) : (
            <>
              <span>Explore with a demo account</span>
            </>
          )}
        </button>

        <div className="flex items-start gap-2 p-3 bg-blue-50/60 border border-blue-200/50 rounded-lg text-xs text-blue-900 leading-normal">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Demo sessions are completely isolated with dedicated mock research states and are automatically purged after 24 hours.
          </span>
        </div>
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
