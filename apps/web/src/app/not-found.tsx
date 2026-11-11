import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-2 text-center">
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
        <FileQuestion className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold text-ink mb-2">Page Not Found</h1>
      <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
        The workspace route you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/overview"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
      >
        Return to Overview
      </Link>
    </div>
  );
}
