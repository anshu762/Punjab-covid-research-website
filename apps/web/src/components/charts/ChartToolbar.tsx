"use client";

import React from "react";
import {
  Download,
  RotateCcw,
  Table as TableIcon,
  LineChart,
} from "lucide-react";

interface ChartToolbarProps {
  onResetZoom?: () => void;
  isTableView: boolean;
  onToggleTableView: () => void;
  onDownloadCsv: () => void;
  title?: string;
  hasData?: boolean;
}

export function ChartToolbar({
  onResetZoom,
  isTableView,
  onToggleTableView,
  onDownloadCsv,
  title,
  hasData = true,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
      {title && (
        <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
          {title}
        </h4>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {!isTableView && onResetZoom && (
          <button
            type="button"
            onClick={onResetZoom}
            disabled={!hasData}
            title="Reset Zoom"
            aria-label="Reset zoom"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-surface text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTableView}
          disabled={!hasData}
          title={isTableView ? "Show chart" : "View as data table"}
          aria-label={isTableView ? "Show chart" : "View as data table"}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-surface text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isTableView ? (
            <>
              <LineChart className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Chart</span>
            </>
          ) : (
            <>
              <TableIcon className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Table</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDownloadCsv}
          disabled={!hasData}
          title="Download chart data as CSV"
          aria-label="Download chart data as CSV"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-surface text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </div>
  );
}
