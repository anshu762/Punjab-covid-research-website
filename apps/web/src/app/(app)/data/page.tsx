import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Database } from "lucide-react";

export default function DataPage() {
  return (
    <div>
      <PageHeader
        title="Data"
        description="Select or upload a dataset, review data quality, and confirm the analysis range."
      />
      <EmptyState
        icon={Database}
        title="No dataset selected"
        explanation="Select the bundled frozen Punjab COVID-19 archive (01 Jul 2020 – 30 Nov 2020) or upload a custom CSV dataset matching the canonical schema. Cleaned series and audit logs will appear here."
        primaryAction={{
          label: "Configure Model Assumptions",
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
