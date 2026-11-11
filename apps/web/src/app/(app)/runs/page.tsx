import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { FolderDown } from "lucide-react";

export default function RunsPage() {
  return (
    <div>
      <PageHeader
        title="Saved runs and downloads"
        description="Reopen historical results, compare compatible models side-by-side, and download reproducibility bundles."
      />
      <EmptyState
        icon={FolderDown}
        title="No saved runs found"
        explanation="Every submitted fit, evaluation, and scenario is automatically saved here with full configuration parameters, SHA-256 data checksums, and downloadable ZIP export bundles."
        primaryAction={{
          label: "Start New Model Run",
          href: "/model",
        }}
        secondaryAction={{
          label: "View Methodology",
          href: "/methods",
        }}
      />
    </div>
  );
}
