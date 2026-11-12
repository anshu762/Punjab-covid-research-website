"use client";

import { Table, BarChart3, Download, Image as ImageIcon, FileCode, Loader2 } from "lucide-react";
import React, { useState } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  tableAlternative?: React.ReactNode;
  caption?: string;
  footer?: React.ReactNode;
  onDownloadCsv?: () => void;
  onExportPng?: () => Promise<void> | void;
  onExportSvg?: () => Promise<void> | void;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  toolbar,
  children,
  tableAlternative,
  caption,
  footer,
  onDownloadCsv,
  onExportPng,
  onExportSvg,
  className = "",
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingSvg, setIsExportingSvg] = useState(false);

  const isExporting = isExportingPng || isExportingSvg;

  async function handleExportPng() {
    if (!onExportPng || isExporting) return;
    try {
      setIsExportingPng(true);
      await onExportPng();
    } finally {
      setIsExportingPng(false);
    }
  }

  async function handleExportSvg() {
    if (!onExportSvg || isExporting) return;
    try {
      setIsExportingSvg(true);
      await onExportSvg();
    } finally {
      setIsExportingSvg(false);
    }
  }

  return (
    <div
      className={`flex flex-col bg-surface border border-border rounded-[14px] shadow-xs overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface">
        <div>
          <h4 className="text-sm font-semibold text-ink tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {toolbar}

          {/* Export PNG */}
          {onExportPng && (
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              aria-label="Export figure as 300 DPI PNG"
              title="Export 300 DPI PNG"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-muted" />
              )}
              <span className="hidden sm:inline">PNG</span>
            </button>
          )}

          {/* Export SVG */}
          {onExportSvg && (
            <button
              type="button"
              onClick={handleExportSvg}
              disabled={isExporting}
              aria-label="Export figure as vector SVG"
              title="Export SVG"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingSvg ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-muted" />
              )}
              <span className="hidden sm:inline">SVG</span>
            </button>
          )}

          {/* Download CSV */}
          {onDownloadCsv && (
            <button
              type="button"
              onClick={onDownloadCsv}
              aria-label="Download chart data as CSV"
              title="Download CSV"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Download className="w-3.5 h-3.5 text-muted" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}

          {/* Table Alternative Toggle */}
          {tableAlternative && (
            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              aria-pressed={showTable}
              aria-label={showTable ? "Switch to interactive chart view" : "Switch to accessible data table view"}
              title={showTable ? "View Chart" : "View as Table"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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

      {footer && (
        <div className="px-5 py-2 bg-slate-50/50 border-t border-border text-[10px] font-mono text-muted flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}
