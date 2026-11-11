"use client";

import { HelpCircle } from "lucide-react";
import React, { useState } from "react";

interface FieldHelpProps {
  label: string;
  tooltip?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
}

export function FieldHelp({
  label,
  tooltip,
  hint,
  required = false,
  htmlFor,
}: FieldHelpProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex flex-col gap-0.5 mb-1">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-slate-800 tracking-tight"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {tooltip && (
          <div className="relative inline-flex items-center">
            <button
              type="button"
              aria-label={`Help: ${label}`}
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-slate-600 focus-visible:ring-1 focus-visible:ring-blue-600 rounded-full"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div
                role="tooltip"
                className="absolute z-50 left-5 top-0 w-56 p-2 text-xs rounded-md shadow-md bg-navy-900 text-white font-normal"
              >
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}
