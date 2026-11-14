import React from "react";

export default function MethodsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-56 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* 2-Column Methods Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: TOC (4 cols on lg) */}
        <div className="hidden lg:block lg:col-span-4 bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-slate-100 rounded" />
            ))}
          </div>
        </div>

        {/* Right Column: Sections & Equations (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-2xs space-y-4">
            <div className="h-5 w-44 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
            </div>
            <div className="h-20 bg-slate-50 rounded-xl border border-border/60 flex items-center justify-center">
              <div className="h-6 w-64 bg-slate-200 rounded" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 shadow-2xs space-y-4">
            <div className="h-5 w-52 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
