"use client";

import { signIn } from "next-auth/react";
import { formatUserError } from "./error-formatter";

/**
 * Launch an isolated demo session from client components.
 * Uses standard NextAuth REST endpoint (/api/auth/callback/demo).
 * Completely immune to Server Action deployment skew.
 */
export async function launchDemoSession(): Promise<{ success: boolean; error?: string }> {
  try {
    // NextAuth signIn with redirect: true navigates to callbackUrl on success
    await signIn("demo", {
      callbackUrl: "/overview",
      redirect: true,
    });
    return { success: true };
  } catch (err: unknown) {
    const { message } = formatUserError(err, "Unable to launch demo session. Please try again.");
    return { success: false, error: message };
  }
}

/**
 * Sign in using email and password credentials.
 * Standard NextAuth credentials flow via /api/auth/callback/credentials.
 */
export async function loginWithCredentialsClient(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/overview",
      redirect: false,
    });

    if (res?.error) {
      return {
        success: false,
        error: "Invalid email or password. Please verify and try again.",
      };
    }

    if (res?.ok) {
      window.location.href = res.url || "/overview";
      return { success: true };
    }

    return { success: false, error: "Authentication failed. Please try again." };
  } catch (err: unknown) {
    const { message } = formatUserError(err, "Sign in failed. Please try again.");
    return { success: false, error: message };
  }
}

/**
 * Register a new user via standard /api/auth/register route handler.
 */
export async function registerUserClient(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || "Failed to create account. Please try again.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const { message } = formatUserError(
      err,
      "Failed to create account. Please check your network connection."
    );
    return { success: false, error: message };
  }
}
