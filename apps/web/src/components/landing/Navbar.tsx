"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { startDemoSession } from "@/actions/auth";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function LandingNavbar() {
  const { openAuthModal } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleStartDemo = async () => {
    setDemoLoading(true);
    try {
      await startDemoSession();
    } catch {
      setDemoLoading(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-border shadow-xs"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs group-hover:bg-blue-700 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <span className="font-bold text-lg text-ink tracking-tight">EpiLens</span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-ink transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#playground" className="hover:text-ink transition-colors">
            Simulation
          </a>
          <a href="#rigor" className="hover:text-ink transition-colors">
            Rigor
          </a>
          <a href="#stack" className="hover:text-ink transition-colors">
            Stack
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={() => openAuthModal("signin")}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-ink hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            type="button"
            disabled={demoLoading}
            onClick={handleStartDemo}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-lg shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center gap-2 cursor-pointer"
          >
            {demoLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <span>Try the demo</span>
            )}
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 text-slate-600 hover:text-ink hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-white px-4 pt-2 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3 text-sm font-medium text-slate-700">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:bg-slate-50 rounded"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:bg-slate-50 rounded"
            >
              How it works
            </a>
            <a
              href="#playground"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:bg-slate-50 rounded"
            >
              Simulation
            </a>
            <a
              href="#rigor"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:bg-slate-50 rounded"
            >
              Rigor
            </a>
            <a
              href="#stack"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:bg-slate-50 rounded"
            >
              Stack
            </a>
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal("signin");
              }}
              className="w-full text-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={demoLoading}
              onClick={handleStartDemo}
              className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              {demoLoading ? "Launching demo..." : "Try the demo"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
