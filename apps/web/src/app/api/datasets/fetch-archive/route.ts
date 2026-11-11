import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { computeFetch } from "@/lib/compute";
import { FetchArchiveSchema } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const input = FetchArchiveSchema.parse(body);

  const res = await computeFetch("/internal/datasets/fetch-archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new HttpError(res.status, "FETCH_ARCHIVE_FAILED", errorJson.detail || "Archive fetch failed");
  }

  const data = await res.json();
  return NextResponse.json(data);
});
