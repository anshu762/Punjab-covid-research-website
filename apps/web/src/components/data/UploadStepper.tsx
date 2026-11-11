"use client";

import React, { useState } from "react";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { useConfirmDataset } from "@/hooks/useDatasets";
import { DEFAULT_DATE_RANGE } from "@epilens/shared";

interface UploadStepperProps {
  onSuccess: (datasetId: string, name: string) => void;
  onCancel?: () => void;
}

interface UploadResponse {
  dataset_id: string;
  family_id: string;
  name: string;
  filename: string;
  headers: string[];
  preview_rows: string[][];
  suggested_mapping: {
    date: string | null;
    new_confirmed: string | null;
    region_code: string | null;
  };
}

export function UploadStepper({ onSuccess, onCancel }: UploadStepperProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Column mapping state
  const [dateCol, setDateCol] = useState<string>("");
  const [countCol, setCountCol] = useState<string>("");
  const [regionCol, setRegionCol] = useState<string>("");

  // Confirmation settings
  const [startDate, setStartDate] = useState<string>(DEFAULT_DATE_RANGE.start);
  const [endDate, setEndDate] = useState<string>(DEFAULT_DATE_RANGE.end);
  const [population, setPopulation] = useState<number>(27743338);

  const confirmMutation = useConfirmDataset();
  const setWorkspaceDataset = useWorkspaceStore((s) => s.setDataset);
  const setWorkspaceDateRange = useWorkspaceStore((s) => s.setDateRange);

  // Step 1: Upload file directly to compute service
  async function handleFileUpload() {
    if (!file) return;
    setErrorMsg(null);
    setIsUploading(true);

    try {
      // 1. Obtain short-lived signed upload token from BFF
      const tokenRes = await fetch("/api/datasets/upload-token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error("Failed to authorize upload");
      }
      const { uploadUrl, token } = await tokenRes.json();

      // 2. Direct upload to compute service
      const formData = new FormData();
      formData.append("file", file);

      const computeRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!computeRes.ok) {
        const err = await computeRes.json().catch(() => ({}));
        const detail = err.detail || err.error;
        const msg = typeof detail === "object" ? detail.message || JSON.stringify(detail) : String(detail);
        throw new Error(msg || "File validation failed");
      }

      const resData: UploadResponse = await computeRes.json();
      setUploadResult(resData);

      // Pre-fill suggested mappings
      if (resData.suggested_mapping.date) setDateCol(resData.suggested_mapping.date);
      if (resData.suggested_mapping.new_confirmed) setCountCol(resData.suggested_mapping.new_confirmed);
      if (resData.suggested_mapping.region_code) setRegionCol(resData.suggested_mapping.region_code);

      setStep(2);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  // Step 3: Finalize confirmation
  async function handleFinalizeConfirm() {
    if (!uploadResult) return;
    setErrorMsg(null);

    try {
      await confirmMutation.mutateAsync({
        datasetId: uploadResult.dataset_id,
        columnMapping: {
          date: dateCol,
          new_confirmed: countCol,
          region_code: regionCol || undefined,
        },
        dateRange: startDate && endDate ? [startDate, endDate] : undefined,
        population,
      });

      setWorkspaceDataset(uploadResult.dataset_id, uploadResult.name, false);
      setWorkspaceDateRange({ start: startDate, end: endDate });
      onSuccess(uploadResult.dataset_id, uploadResult.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Confirmation failed");
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Stepper Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-ink text-sm sm:text-base">Upload Observation CSV</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <span className={`px-2.5 py-1 rounded-full ${step === 1 ? "bg-blue-600 text-white" : "bg-border text-ink"}`}>
            1. Upload
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
          <span className={`px-2.5 py-1 rounded-full ${step === 2 ? "bg-blue-600 text-white" : "bg-border text-ink"}`}>
            2. Map Schema
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
          <span className={`px-2.5 py-1 rounded-full ${step === 3 ? "bg-blue-600 text-white" : "bg-border text-ink"}`}>
            3. Confirm
          </span>
        </div>
      </div>

      <div className="p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Select File */}
        {step === 1 && (
          <div className="space-y-4">
            <label
              htmlFor="csv-file-input"
              className="border-2 border-dashed border-border hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-surface-2/40 text-center"
            >
              <Upload className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm font-semibold text-ink">
                {file ? file.name : "Choose CSV file or drag and drop here"}
              </span>
              <span className="text-xs text-muted mt-1">
                Max 10 MB. UTF-8 encoded aggregate daily case counts for Punjab (PB).
              </span>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
                className="hidden"
              />
            </label>

            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900 border border-blue-200">
              <strong>Privacy guarantee:</strong> EpiLens only accepts aggregate temporal counts. Files with patient
              names, IDs, phone numbers, or addresses will be automatically rejected.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-medium text-muted hover:text-ink rounded-lg border border-border"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={!file || isUploading}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Continue to Mapping
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && uploadResult && (
          <div className="space-y-5">
            <p className="text-xs text-muted">
              Map the column headers detected in <strong>{uploadResult.filename}</strong> to the canonical EpiLens
              schema.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date column */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Date Column <span className="text-danger">*</span>
                </label>
                <select
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select column...</option>
                  {uploadResult.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">ISO YYYY-MM-DD or DD-MM-YYYY</span>
              </div>

              {/* Confirmed cases column */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  New Confirmed Cases <span className="text-danger">*</span>
                </label>
                <select
                  value={countCol}
                  onChange={(e) => setCountCol(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select column...</option>
                  {uploadResult.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">Daily integers (negative = correction)</span>
              </div>

              {/* Region column */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Region Code <span className="text-muted">(Optional)</span>
                </label>
                <select
                  value={regionCol}
                  onChange={(e) => setRegionCol(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None (Assume all PB)</option>
                  {uploadResult.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">Must be PB (Punjab)</span>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <span className="text-xs font-semibold text-ink block mb-2">First 10 Preview Rows:</span>
              <div className="overflow-x-auto border border-border rounded-lg max-h-48">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-2 border-b border-border text-muted sticky top-0">
                    <tr>
                      {uploadResult.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {uploadResult.preview_rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-muted hover:text-ink rounded-lg border border-border flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!dateCol || !countCol}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition"
              >
                Next: Provenance <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Date Range & Provenance */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                State Population Baseline (Census 2011)
              </label>
              <input
                type="number"
                value={population}
                onChange={(e) => setPopulation(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface font-mono"
              />
              <span className="text-[11px] text-muted">
                Official Punjab Census 2011 baseline: 27,743,338. Used for susceptible pool calculations.
              </span>
            </div>

            <div className="p-3 bg-surface-2 border border-border rounded-xl text-xs space-y-1">
              <span className="font-semibold text-ink">Cleaning and Validation Rules Applied:</span>
              <ul className="list-disc list-inside text-muted space-y-0.5">
                <li>Calendar continuity: Gaps and blank values flagged as MISSING (never converted to 0).</li>
                <li>Negative corrections: Chronological 14-day lookback rollback engine.</li>
                <li>Audit logging: Full transformation trace generated.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-muted hover:text-ink rounded-lg border border-border flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={handleFinalizeConfirm}
                disabled={confirmMutation.isPending}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition"
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Confirm and Normalize Dataset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
