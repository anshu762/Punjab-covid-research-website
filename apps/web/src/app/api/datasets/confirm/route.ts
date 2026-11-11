import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { computeFetch } from "@/lib/compute";
import { ConfirmDatasetSchema } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const input = ConfirmDatasetSchema.parse(body);

  const res = await computeFetch(
    `/internal/datasets/${encodeURIComponent(input.datasetId)}/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        column_mapping: input.columnMapping,
        date_range: input.dateRange ?? null,
        population: input.population ?? null,
      }),
    }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const code = errorJson.detail?.code || "COMPUTE_ERROR";
    const message = errorJson.detail?.message || errorJson.detail || "Confirmation failed";
    throw new HttpError(res.status, code, typeof message === "string" ? message : JSON.stringify(message));
  }

  const data = await res.json();
  return NextResponse.json(data);
});
