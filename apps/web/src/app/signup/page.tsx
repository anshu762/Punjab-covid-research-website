"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React, { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

function SignUpContent() {
  return (
    <div className="w-full max-w-3xl space-y-4">
      {/* Return to Landing Page */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to public homepage</span>
        </Link>
      </div>

      <AuthCard initialMode="signup" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-2 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
      <Suspense fallback={<div className="text-sm text-muted">Loading registration...</div>}>
        <SignUpContent />
      </Suspense>
    </div>
  );
}
