import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sliders } from "lucide-react";

export default function ModelSetupPage() {
  return (
    <div>
      <PageHeader
        title="Model setup"
        description="Configure epidemiological assumptions and run an empirical model fit or 7-day forecast evaluation."
      />
      <EmptyState
        icon={Sliders}
        title="Ready for model configuration"
        explanation="Choose between Constant transmission SIR (M1) and Change-point SIR (M2), calibrate infectious duration and reporting assumptions, and launch a deterministic optimization job."
        primaryAction={{
          label: "Verify Dataset Coverage",
          href: "/data",
        }}
        secondaryAction={{
          label: "View Methodology",
          href: "/methods",
        }}
      />
    </div>
  );
}
