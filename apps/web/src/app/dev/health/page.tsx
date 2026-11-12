"use client";

import { useEffect, useState } from "react";

export default function DevHealthPage() {
  const [webHealth, setWebHealth] = useState<string>("checking...");
  const [computeHealth, setComputeHealth] = useState<string>("checking...");
  const [selftestStatus, setSelftestStatus] = useState<string>("idle");
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setWebHealth(data.ok ? "Healthy (200 OK)" : "Degraded"))
      .catch(() => setWebHealth("Unreachable"));

    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setComputeHealth(data.ok ? "Healthy (200 OK)" : "Degraded"))
      .catch(() => setComputeHealth("Unreachable (is apps/compute running?)"));
  }, []);

  const handleRunSelftest = async () => {
    setSelftestStatus("Submitting...");
    try {
      const res = await fetch("/api/dev/selftest", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setJobId(data.job_id);
        setSelftestStatus(`QUEUED (Job ID: ${data.job_id})`);
      } else {
        setSelftestStatus(`Error: ${data.error?.message || "Failed"}`);
      }
    } catch (e) {
      setSelftestStatus(`Network error: ${String(e)}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4 text-ink">
        EpiLens Dev Diagnostics & Health
      </h1>

      <div className="p-4 border border-border rounded-lg mb-4 bg-surface">
        <p className="text-sm"><strong>Web Service (Next.js):</strong> {webHealth}</p>
        <p className="text-sm"><strong>Compute Service (FastAPI):</strong> {computeHealth}</p>
      </div>

      <div className="p-4 border border-border rounded-lg bg-surface">
        <h2 className="text-lg font-semibold mb-2 text-ink">Postgres Job Queue Selftest</h2>
        <p className="text-sm text-muted mb-3">
          Enqueues a SELFTEST job via Next.js BFF &rarr; FastAPI compute service &rarr; Postgres worker.
        </p>
        <button
          onClick={handleRunSelftest}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Run Selftest Job
        </button>
        <div className="mt-3 text-sm text-ink">
          <strong>Status:</strong> {selftestStatus}
          {jobId && <p className="text-xs text-muted font-mono mt-1">ID: {jobId}</p>}
        </div>
      </div>
    </div>
  );
}
