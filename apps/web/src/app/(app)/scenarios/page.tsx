import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrendingUp } from "lucide-react";

export default function ScenariosPage() {
  return (
    <div>
      <PageHeader
        title="Scenario explorer"
        description="Compare baseline transmission with hypothetical transmission rate changes over a forward horizon."
      />
      <EmptyState
        icon={TrendingUp}
        title="Scenario simulation requires a completed fit"
        explanation="Simulating hypothetical scenarios requires calibrated starting state values (S, I, R) and the final fitted beta from an empirical run. Once a fit is completed, you can test deltas from -50% to +50%."
        primaryAction={{
          label: "Run an Empirical Fit First",
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
