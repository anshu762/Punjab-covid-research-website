import { apiHandler, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
import { SignUpSchema } from "@epilens/shared";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const parseResult = SignUpSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      firstIssue?.message || "Invalid registration details",
      firstIssue?.path[0]?.toString()
    );
  }

  const { name, email, password } = parseResult.data;

  const existing = await db.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new HttpError(
      409,
      "USER_EXISTS",
      "An account with this email address already exists. Please sign in instead."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      isDemo: false,
    },
  });

  return NextResponse.json({ success: true, message: "Account created successfully" });
});
