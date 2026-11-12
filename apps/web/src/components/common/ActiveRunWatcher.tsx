"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace";
import { useRun, useRuns, isTerminalStatus } from "@/hooks/useRuns";

export function ActiveRunWatcher() {
  const router = useRouter();
  const { activeRunId, setActiveRun } = useWorkspaceStore();
  const lastTerminalNotified = useRef<string | null>(null);

  // If no active run ID is currently in store, query active runs from server to recover across refreshes
  const { data: serverActiveRuns } = useRuns(true);

  useEffect(() => {
    if (!activeRunId && serverActiveRuns && serverActiveRuns.length > 0) {
      const firstActive = serverActiveRuns[0];
      setActiveRun(firstActive.id, firstActive.status);
    }
  }, [activeRunId, serverActiveRuns, setActiveRun]);

  const { data: currentRun } = useRun(activeRunId);

  useEffect(() => {
    if (!currentRun) return;

    // Update live status in workspace store
    setActiveRun(currentRun.id, currentRun.status);

    // Notify upon terminal transition once
    if (isTerminalStatus(currentRun.status) && lastTerminalNotified.current !== currentRun.id) {
      lastTerminalNotified.current = currentRun.id;

      if (currentRun.status === "COMPLETED") {
        toast.success(`Analysis "${currentRun.displayName}" completed`, {
          description: "Parameter estimates and trajectories are ready.",
          action: {
            label: "View Results",
            onClick: () => {
              router.push(`/results?runId=${currentRun.id}`);
            },
          },
          duration: 8000,
        });
      } else if (currentRun.status === "FAILED") {
        toast.error(`Analysis "${currentRun.displayName}" failed`, {
          description: currentRun.errorMessage || "An unexpected error occurred.",
          duration: 10000,
        });
      }
    }
  }, [currentRun, setActiveRun, router]);

  return null;
}
