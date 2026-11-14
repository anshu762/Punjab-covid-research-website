import React from "react";

export default function RunsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface border border-border rounded-[14px] shadow-xs">
        <div className="h-9 w-72 max-w-full bg-slate-100 rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-100 rounded-lg" />
          <div className="h-9 w-32 bg-slate-100 rounded-lg" />
          <div className="h-4 w-16 bg-slate-100 rounded ml-2" />
        </div>
      </div>

      {/* Runs Table Skeleton */}
      <div className="border border-border rounded-[14px] bg-surface overflow-hidden shadow-xs">
        <div className="p-3 bg-surface-2 border-b border-border flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-44 bg-slate-200 rounded" />
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="h-4 w-28 bg-slate-100 rounded hidden md:block" />
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded bg-slate-100" />
                  <div className="w-7 h-7 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3.5 bg-surface-2 border-t border-border flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="flex gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100" />
            <div className="w-7 h-7 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
