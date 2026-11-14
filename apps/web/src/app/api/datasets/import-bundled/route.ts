import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { computeFetch } from "@/lib/compute";
import { ImportBundledSchema } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const input = ImportBundledSchema.parse(body);

  const res = await computeFetch("/internal/datasets/import-bundled", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      source_key: input.sourceKey,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message =
      errorJson.detail ||
      errorJson.error?.message ||
      "Import failed";
    throw new HttpError(res.status, "IMPORT_FAILED", message);
  }

  const data = await res.json();
  return NextResponse.json(data);
});
