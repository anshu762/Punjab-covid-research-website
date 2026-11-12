"use client";

import React, { useState } from "react";
import { formatNumber } from "@epilens/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTableColumn {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  pageSize?: number;
  defaultPageSize?: number;
  caption?: string;
}

export function DataTable({
  columns,
  data,
  pageSize = 10,
  defaultPageSize,
  caption,
}: DataTableProps) {
  const actualPageSize = defaultPageSize || pageSize;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / actualPageSize));

  const startIdx = (page - 1) * actualPageSize;
  const pageData = data.slice(startIdx, startIdx + actualPageSize);

  return (
    <div className="w-full border border-border rounded-xl bg-surface overflow-hidden">
      {caption && (
        <div className="px-4 py-3 bg-surface-2 border-b border-border text-xs font-semibold text-muted uppercase tracking-wider">
          {caption}
        </div>
      )}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-sm text-ink border-collapse">
          <thead className="bg-surface-2 text-xs font-medium text-muted uppercase sticky top-0 border-b border-border z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-2.5 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted font-sans"
                >
                  No data points available
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  {columns.map((col) => {
                    const rawVal = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2 whitespace-nowrap ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {col.render
                          ? col.render(rawVal, row)
                          : typeof rawVal === "number"
                          ? formatNumber(rawVal)
                          : rawVal !== null && rawVal !== undefined
                          ? String(rawVal)
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-t border-border text-xs text-muted">
          <span>
            Showing {startIdx + 1} to {Math.min(startIdx + pageSize, data.length)} of{" "}
            {data.length} rows
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="p-1 rounded border border-border hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-ink px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="p-1 rounded border border-border hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
