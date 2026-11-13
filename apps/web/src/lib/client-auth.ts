"use client";

import { signIn } from "next-auth/react";
import { formatUserError } from "./error-formatter";

/**
 * Launch an isolated demo session from client components.
 * Uses standard NextAuth client API (/api/auth/signin/demo) instead of ephemeral
 * Server Action hashes, guaranteeing seamless guest login even right after a new deployment.
 */
export async function launchDemoSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await signIn("demo", {
      callbackUrl: "/overview",
      redirect: false,
    });

    if (res?.error) {
      const { message } = formatUserError(res.error);
      return { success: false, error: message };
    }

    if (res?.ok) {
      window.location.href = res.url || "/overview";
      return { success: true };
    }

    return {
      success: false,
      error: "Unable to start demo session. Please try again.",
    };
  } catch (err: unknown) {
    const { message, isDeploymentSkew } = formatUserError(err);
    if (isDeploymentSkew) {
      window.location.reload();
      return { success: false };
    }
    return { success: false, error: message };
  }
}
