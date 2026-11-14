import React from "react";

export default function DataLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-64 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
      </div>

      {/* Top Source Tabs Card Skeleton */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
            <div className="h-8 w-28 bg-slate-100 rounded-lg" />
            <div className="h-8 w-32 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-8 w-40 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
      </div>

      {/* 3 Provenance & Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-32 bg-slate-200 rounded" />
            <div className="h-3.5 w-8 bg-slate-100 rounded" />
          </div>
          <div className="h-7 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
          <div className="h-3.5 w-32 bg-slate-200 rounded" />
          <div className="h-7 w-24 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
          <div className="h-3.5 w-32 bg-slate-200 rounded" />
          <div className="h-7 w-36 bg-slate-200 rounded" />
          <div className="h-3 w-44 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Quality Coverage Strip Skeleton */}
      <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-3">
        <div className="h-4 w-48 bg-slate-200 rounded" />
        <div className="h-10 bg-slate-100 rounded-lg" />
      </div>

      {/* Observations Table Skeleton */}
      <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="h-8 w-36 bg-slate-100 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3.5 flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
