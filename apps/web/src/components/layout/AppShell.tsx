"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  Database,
  FolderDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Sliders,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { DemoBadge } from "../common/DemoBadge";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    isDemo?: boolean;
  };
}

const NAV_ITEMS = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Data", href: "/data", icon: Database },
  { label: "Model setup", href: "/model", icon: Sliders },
  { label: "Results", href: "/results", icon: BarChart2 },
  { label: "Scenario explorer", href: "/scenarios", icon: TrendingUp },
  { label: "Saved runs & downloads", href: "/runs", icon: FolderDown },
  { label: "Methods", href: "/methods", icon: BookOpen },
] as const;

function NavLinksList({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-navy-800 text-white font-semibold shadow-xs border-l-4 border-blue-600 pl-2.5"
                : "text-slate-300 hover:text-white hover:bg-navy-800/60"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-2 flex">
      {/* Skip to Content Landmark */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-hidden"
      >
        Skip to main content
      </a>

      {/* Desktop Fixed Left Navigation (260px) */}
      <aside className="hidden md:flex flex-col w-[260px] bg-navy-900 border-r border-navy-800 shrink-0 select-none sticky top-0 h-screen self-start z-20">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 h-14 px-5 border-b border-navy-800 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight leading-none">
              EpiLens
            </div>
            <div className="text-[10px] text-slate-400 tracking-wide mt-0.5">
              Punjab COVID-19 Workbench
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <NavLinksList pathname={pathname} />
        </div>

        {/* User Menu at Bottom */}
        <div className="p-4 border-t border-navy-800 bg-navy-900/60 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-navy-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-white truncate">
                  {user?.name || "Researcher"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email || "researcher@epilens.local"}
                </div>
              </div>
            </div>
            {user?.isDemo && <DemoBadge label="Demo" />}
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-navy-800 rounded-md transition-colors border border-navy-800 mt-2 focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header + Hamburger Sheet (<768px) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-navy-900 border-b border-navy-800 text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight">EpiLens</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[80%] bg-navy-900 text-white shadow-2xl h-full">
            <div className="flex items-center justify-between h-14 px-5 border-b border-navy-800">
              <span className="font-bold text-base tracking-tight">EpiLens</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinksList pathname={pathname} onItemClick={() => setMobileOpen(false)} />
            </div>
            <div className="p-4 border-t border-navy-800">
              <div className="text-xs font-medium text-white mb-1">
                {user?.name || "Researcher"}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white bg-navy-800 rounded-md"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pt-0 pt-14">
        <main id="main-content" className="flex-1 focus:outline-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
