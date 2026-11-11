import { computeFetch } from "@/lib/compute";
import { apiHandler, HttpError } from "@/lib/http";
import { NextResponse } from "next/server";

export const POST = apiHandler(async () => {
  if (process.env.NODE_ENV === "production") {
    throw new HttpError(404, "NOT_FOUND", "Endpoint not available in production");
  }

  const res = await computeFetch("/internal/selftest", {
    method: "POST",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new HttpError(
      res.status,
      "COMPUTE_ERROR",
      `Compute selftest call failed: ${errorText}`
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
});
