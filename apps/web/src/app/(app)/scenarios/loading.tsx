import React from "react";

export default function ScenariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-52 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* 2-Column Scenarios Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls (4 cols on lg) */}
        <div className="lg:col-span-4 bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-6">
          <div className="space-y-2">
            <div className="h-3.5 w-32 bg-slate-200 rounded" />
            <div className="h-9 bg-slate-100 rounded-lg" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-3.5 w-36 bg-slate-200 rounded" />
              <div className="h-4 w-12 bg-slate-100 rounded" />
            </div>
            <div className="h-6 bg-slate-100 rounded" />
            <div className="flex gap-1.5 flex-wrap">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 w-11 bg-slate-100 rounded" />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-14 bg-slate-100 rounded" />
            </div>
            <div className="h-6 bg-slate-100 rounded" />
          </div>

          <div className="h-9 bg-blue-50 rounded-lg border border-blue-100" />
          <div className="h-10 bg-blue-100 rounded-lg" />
        </div>

        {/* Right Column: Scenario Charts (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-7 w-24 bg-slate-100 rounded-md" />
            </div>
            <div className="h-[280px] bg-slate-50 rounded-xl border border-border/60" />
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-7 w-24 bg-slate-100 rounded-md" />
            </div>
            <div className="h-[280px] bg-slate-50 rounded-xl border border-border/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
