"use client";

import { ArrowRight } from "lucide-react";
import React, { useState } from "react";
import { startDemoSession } from "@/actions/auth";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function LandingFooter() {
  const { openAuthModal } = useAuthModal();
  const [demoLoading, setDemoLoading] = useState(false);
  const authorName = process.env.NEXT_PUBLIC_AUTHOR_NAME;
  const authorUrl = process.env.NEXT_PUBLIC_AUTHOR_URL;

  const handleStartDemo = async () => {
    setDemoLoading(true);
    try {
      await startDemoSession();
    } catch {
      setDemoLoading(false);
    }
  };

  return (
    <footer className="bg-navy-900 text-white">
      {/* Final CTA Band */}
      <div className="border-b border-navy-800 py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to explore Punjab&apos;s epidemiological dynamics?
          </h3>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Experience the private workbench with an isolated 24-hour demo session or sign in to configure empirical runs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={demoLoading}
              onClick={handleStartDemo}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {demoLoading ? (
                <span>Launching...</span>
              ) : (
                <>
                  <span>Explore Demo Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white bg-navy-800 hover:bg-navy-800/80 rounded-xl transition-colors text-center cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Sub-footer & Disclaimers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          <span className="font-semibold text-white">EpiLens</span> &mdash; Research workbench for Punjab COVID-19 data.
        </div>

        <div className="text-center sm:text-right space-y-1">
          <p className="text-amber-300/80">
            Research tool &mdash; not medical or public policy advice.
          </p>
          {authorName && (
            <p>
              Designed &amp; built by{" "}
              {authorUrl ? (
                <a
                  href={authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:underline font-medium"
                >
                  {authorName}
                </a>
              ) : (
                <span className="text-white font-medium">{authorName}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
