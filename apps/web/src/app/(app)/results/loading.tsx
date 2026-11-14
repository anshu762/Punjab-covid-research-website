import React from "react";

export default function ResultsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* Identity Bar */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200" />
          <div className="space-y-1">
            <div className="h-4 w-52 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-4 w-16 bg-slate-100 rounded-full" />
              <div className="h-4 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-44 bg-slate-100 rounded-lg" />
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded" />
            <div className="h-2.5 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Tab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <div className="h-8 w-36 bg-slate-200 rounded-lg shrink-0" />
        <div className="h-8 w-32 bg-slate-100 rounded-lg shrink-0" />
        <div className="h-8 w-36 bg-slate-100 rounded-lg shrink-0" />
        <div className="h-8 w-40 bg-slate-100 rounded-lg shrink-0" />
        <div className="h-8 w-36 bg-slate-100 rounded-lg shrink-0" />
      </div>

      {/* Chart Canvas Card */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="flex gap-2">
            <div className="h-7 w-20 bg-slate-100 rounded-md" />
            <div className="h-7 w-24 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="h-[380px] bg-slate-50 rounded-xl border border-border/60 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  );
}
