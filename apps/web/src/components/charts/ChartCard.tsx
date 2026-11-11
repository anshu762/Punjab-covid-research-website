"use client";

import { Table, BarChart3, Download } from "lucide-react";
import React, { useState } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  tableAlternative?: React.ReactNode;
  caption?: string;
  onDownloadCsv?: () => void;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  toolbar,
  children,
  tableAlternative,
  caption,
  onDownloadCsv,
  className = "",
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      className={`flex flex-col bg-surface border border-border rounded-[14px] shadow-xs overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface">
        <div>
          <h4 className="text-sm font-semibold text-ink tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {toolbar}

          {onDownloadCsv && (
            <button
              type="button"
              onClick={onDownloadCsv}
              aria-label="Download chart data as CSV"
              title="Download CSV"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Download className="w-3.5 h-3.5 text-muted" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}

          {tableAlternative && (
            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              aria-pressed={showTable}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {showTable ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Chart</span>
                </>
              ) : (
                <>
                  <Table className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Table</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 min-h-[300px]">
        {showTable && tableAlternative ? tableAlternative : children}
      </div>

      {caption && (
        <div className="px-5 py-2.5 bg-surface-2 border-t border-border text-[11px] text-muted leading-relaxed">
          {caption}
        </div>
      )}
    </div>
  );
}
