import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required").optional(),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  COMPUTE_URL: z.string().url().default("http://localhost:8000"),
  COMPUTE_SHARED_SECRET: z.string().min(1).default("epilens-local-internal-compute-secret"),
  CRON_SECRET: z.string().min(1).default("epilens-local-cron-secret"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.0-flash-001"),
  OPENROUTER_FALLBACK_MODELS: z.string().default("meta-llama/llama-3.3-70b-instruct"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_COMPUTE_PUBLIC_URL: z.string().url().default("http://localhost:8000"),
  NEXT_PUBLIC_AUTHOR_NAME: z.string().optional(),
  NEXT_PUBLIC_AUTHOR_URL: z.string().optional(),
});

function validateEnv() {
  const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
  
  // Provide safe dev defaults if not set in local dev environment
  const rawServer = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL || (isDev ? "postgresql://postgres:postgres@localhost:5432/epilens" : undefined),
    DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || (isDev ? "postgresql://postgres:postgres@localhost:5432/epilens" : undefined),
    AUTH_SECRET: process.env.AUTH_SECRET || (isDev ? "epilens-local-auth-secret-min-32-chars-long" : undefined),
    AUTH_URL: process.env.AUTH_URL || "http://localhost:3000",
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    COMPUTE_URL: process.env.COMPUTE_URL || "http://localhost:8000",
    COMPUTE_SHARED_SECRET: process.env.COMPUTE_SHARED_SECRET || "epilens-local-internal-compute-secret",
    CRON_SECRET: process.env.CRON_SECRET || "epilens-local-cron-secret",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
    OPENROUTER_FALLBACK_MODELS: process.env.OPENROUTER_FALLBACK_MODELS || "meta-llama/llama-3.3-70b-instruct",
  };

  const parsedServer = serverEnvSchema.safeParse(rawServer);

  if (!parsedServer.success) {
    const errorDetails = parsedServer.error.flatten().fieldErrors;
    throw new Error(
      `Invalid server environment variables: ${JSON.stringify(errorDetails, null, 2)}`
    );
  }

  const parsedClient = clientEnvSchema.safeParse({
    NEXT_PUBLIC_COMPUTE_PUBLIC_URL: process.env.NEXT_PUBLIC_COMPUTE_PUBLIC_URL || "http://localhost:8000",
    NEXT_PUBLIC_AUTHOR_NAME: process.env.NEXT_PUBLIC_AUTHOR_NAME,
    NEXT_PUBLIC_AUTHOR_URL: process.env.NEXT_PUBLIC_AUTHOR_URL,
  });

  if (!parsedClient.success) {
    const errorDetails = parsedClient.error.flatten().fieldErrors;
    throw new Error(
      `Invalid client environment variables: ${JSON.stringify(errorDetails, null, 2)}`
    );
  }

  return {
    ...parsedServer.data,
    ...parsedClient.data,
  };
}

export const env = validateEnv();
