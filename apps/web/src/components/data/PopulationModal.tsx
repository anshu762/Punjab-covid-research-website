"use client";

import React, { useState } from "react";
import { useUpdatePopulation } from "@/hooks/useDatasets";
import { X, Users, Loader2 } from "lucide-react";

interface PopulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  currentValue: number;
  currentGeography: string | null;
  currentYear: number | null;
  currentSourceUrl: string | null;
}

export function PopulationModal({
  isOpen,
  onClose,
  datasetId,
  currentValue,
  currentGeography,
  currentYear,
  currentSourceUrl,
}: PopulationModalProps) {
  const [populationValue, setPopulationValue] = useState(currentValue);
  const [geography, setGeography] = useState(currentGeography || "Punjab, India");
  const [referenceYear, setReferenceYear] = useState(currentYear || 2011);
  const [sourceUrl, setSourceUrl] = useState(currentSourceUrl || "https://censusindia.gov.in/");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateMutation = useUpdatePopulation();

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (populationValue < 10000) {
      setErrorMsg("Population must be at least 10,000");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        datasetId,
        populationValue,
        populationGeography: geography,
        populationReferenceYear: referenceYear,
        populationSourceUrl: sourceUrl,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update population");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-lg max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-ink text-sm">Population Provenance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-danger border border-red-200 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Population Baseline Total <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              value={populationValue}
              onChange={(e) => setPopulationValue(Number(e.target.value))}
              required
              min={10000}
              className="w-full text-xs font-mono rounded-lg border border-border px-3 py-2 bg-surface"
            />
            <span className="text-[11px] text-muted">Official Census 2011: 27,743,338</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Geography <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-border px-3 py-2 bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Reference Year</label>
              <input
                type="number"
                value={referenceYear}
                onChange={(e) => setReferenceYear(Number(e.target.value))}
                min={1900}
                max={2100}
                className="w-full text-xs font-mono rounded-lg border border-border px-3 py-2 bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border px-3 py-2 bg-surface truncate"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted hover:text-ink rounded-lg border border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Provenance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
