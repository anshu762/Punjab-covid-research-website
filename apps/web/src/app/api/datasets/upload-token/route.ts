import { apiHandler } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const COMPUTE_PUBLIC_URL = process.env.NEXT_PUBLIC_COMPUTE_URL || "http://localhost:8000";
const COMPUTE_SHARED_SECRET = process.env.COMPUTE_SHARED_SECRET || "epilens-local-internal-compute-secret";

export const POST = apiHandler(async () => {
  const user = await requireUser();

  const secret = new TextEncoder().encode(COMPUTE_SHARED_SECRET);
  const token = await new SignJWT({ scope: "dataset:upload" })
    .setSubject(user.id)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secret);

  return NextResponse.json({
    uploadUrl: `${COMPUTE_PUBLIC_URL.replace(/\/$/, "")}/public/datasets/upload`,
    token,
  });
});
