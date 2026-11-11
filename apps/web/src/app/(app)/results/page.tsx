import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart2 } from "lucide-react";

export default function ResultsPage() {
  return (
    <div>
      <PageHeader
        title="Results"
        description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
      />
      <EmptyState
        icon={BarChart2}
        title="No analysis results to display"
        explanation="Results are populated only after completing a model fit or 7-day forecast evaluation from the Model setup screen. All charts, residual diagnostics, and comparison tables will trace to a specific completed run ID."
        primaryAction={{
          label: "Launch Run in Model Setup",
          href: "/model",
        }}
        secondaryAction={{
          label: "Inspect Saved Runs",
          href: "/runs",
        }}
      />
    </div>
  );
}
