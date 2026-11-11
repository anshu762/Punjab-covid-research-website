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
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        EpiLens Dev Diagnostics & Health
      </h1>

      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 16 }}>
        <p><strong>Web Service (Next.js):</strong> {webHealth}</p>
        <p><strong>Compute Service (FastAPI):</strong> {computeHealth}</p>
      </div>

      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Postgres Job Queue Selftest</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>
          Enqueues a SELFTEST job via Next.js BFF &rarr; FastAPI compute service &rarr; Postgres worker.
        </p>
        <button
          onClick={handleRunSelftest}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Run Selftest Job
        </button>
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <strong>Status:</strong> {selftestStatus}
          {jobId && <p style={{ fontSize: 12, color: "#64748b" }}>ID: {jobId}</p>}
        </div>
      </div>
    </div>
  );
}
