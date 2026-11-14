import React from "react";

export default function ModelLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* Dataset Banner */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200" />
          <div className="space-y-1">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-48 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-8 w-36 bg-slate-100 rounded-lg" />
      </div>

      {/* 2-Column Model Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-surface rounded-[14px] border border-border p-5 sm:p-6 shadow-xs space-y-6">
          {/* Mode Selector */}
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-20 bg-slate-100 rounded-xl border border-border" />
              <div className="h-20 bg-slate-100 rounded-xl border border-border" />
            </div>
          </div>

          {/* Architecture Selector */}
          <div className="space-y-2">
            <div className="h-3.5 w-36 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-20 bg-slate-100 rounded-xl border border-border" />
              <div className="h-20 bg-slate-100 rounded-xl border border-border" />
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-9 bg-slate-100 rounded-lg" />
              <div className="h-9 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2">
            <div className="h-8 bg-slate-100 rounded-lg" />
            <div className="h-8 bg-slate-100 rounded-lg" />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="h-10 w-48 bg-blue-100 rounded-lg" />
            <div className="h-6 w-24 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Right Column: Status & Recent Runs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-8 bg-slate-100 rounded-lg" />
          </div>

          <div className="bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
