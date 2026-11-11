import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/http";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "epilens-local-cron-secret";

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or missing cron secret");
  }

  const result = await db.user.deleteMany({
    where: {
      isDemo: true,
      demoExpiresAt: {
        lt: new Date(),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    deletedDemoUsers: result.count,
    timestamp: new Date().toISOString(),
  });
});
