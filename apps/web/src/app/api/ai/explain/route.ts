import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { SYSTEM_PROMPT, buildContextForKind } from "@/lib/ai/prompts";
import { verifyGrounding } from "@/lib/ai/grounding";
import { NextResponse, type NextRequest } from "next/server";

const ExplainRequestSchema = z.object({
  kind: z.enum(["results", "scenario", "dataset"]),
  refId: z.string().min(1, "refId is required"),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const { kind, refId } = ExplainRequestSchema.parse(body);

  // 1. Rate limiting: max 10 explanations per hour per user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.aiExplanation.count({
    where: {
      ownerId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 10) {
    throw new HttpError(
      429,
      "AI_RATE_LIMIT",
      "You have reached the hourly AI explainer limit (10 per hour). Please wait before requesting another explanation."
    );
  }

  // 2. Build compact context JSON strictly from stored numbers
  const { context, summaryFallback } = await buildContextForKind(kind, refId);
  const contextStr = JSON.stringify(context);
  const inputHash = crypto.createHash("sha256").update(contextStr).digest("hex");

  // 3. Cache lookup: check if identical explanation already generated
  const existing = await prisma.aiExplanation.findFirst({
    where: {
      ownerId: user.id,
      kind,
      refId,
      inputHash,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({
      text: existing.text,
      model: existing.model,
      groundingWarning: existing.groundingWarning,
      cached: true,
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  let text = summaryFallback;
  let modelName = "deterministic-rule-based";
  let hasGroundingWarning = false;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const selectedModel = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "EpiLens COVID-19 Research",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Please explain the following research output in plain language based ONLY on this JSON context:\n\n${contextStr}`,
            },
          ],
          temperature: 0.2, // Low temperature for high factual precision
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.choices?.[0]?.message?.content?.trim();
        if (candidate) {
          text = candidate;
          modelName = selectedModel;

          // 4. Numerical grounding validation
          const grounding = verifyGrounding(text, context);
          hasGroundingWarning = !grounding.grounded;
        }
      }
    } catch {
      // Graceful fallback to deterministic template
      text = summaryFallback;
      modelName = "deterministic-fallback";
    }
  }

  // 5. Store explanation in DB
  await prisma.aiExplanation.create({
    data: {
      ownerId: user.id,
      kind,
      refId,
      inputHash,
      model: modelName,
      text,
      groundingWarning: hasGroundingWarning,
    },
  });

  return NextResponse.json({
    text,
    model: modelName,
    groundingWarning: hasGroundingWarning,
    cached: false,
  });
});
