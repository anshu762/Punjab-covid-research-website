import { AlertCircle } from "lucide-react";
import React from "react";

interface InlineErrorProps {
  id?: string;
  message?: string | null;
  className?: string;
}

export function InlineError({ id, message, className = "" }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`inline-flex items-center gap-1.5 text-xs text-danger font-medium mt-1 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
