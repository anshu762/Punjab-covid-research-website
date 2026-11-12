import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "healthy",
    ok: true,
    service: "epilens-web",
    version: "1.0.0",
    message: "Next.js web BFF service is operational.",
  });
}
