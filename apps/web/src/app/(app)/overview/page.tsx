import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { LayoutDashboard } from "lucide-react";

export default function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Project summary, dataset status, and latest completed analysis."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="No analysis completed yet"
        explanation="To get started, select or upload a Punjab dataset in the Data screen, then configure and run an empirical SIR fit or 7-day forecast evaluation."
        primaryAction={{
          label: "Open Data Screen",
          href: "/data",
        }}
        secondaryAction={{
          label: "Configure Model",
          href: "/model",
        }}
      />
    </div>
  );
}
