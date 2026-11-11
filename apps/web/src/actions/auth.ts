"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { LoginSchema, SignUpSchema, type LoginInput, type SignUpInput } from "@epilens/shared";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Register a new user with full name, email, and password.
 */
export async function signUpUser(input: SignUpInput): Promise<AuthActionResult> {
  const parseResult = SignUpSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      error: parseResult.error.issues[0]?.message || "Invalid registration details",
    };
  }

  const { name, email, password } = parseResult.data;

  try {
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        error: "An account with this email address already exists. Please sign in instead.",
      };
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

    return { success: true };
  } catch (err) {
    console.error("Sign up registration error:", err);
    return {
      error: "An unexpected error occurred while creating your account. Please try again.",
    };
  }
}

/**
 * Log in with email and password credentials.
 */
export async function loginWithCredentials(input: LoginInput): Promise<AuthActionResult> {
  const parseResult = LoginSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      error: parseResult.error.issues[0]?.message || "Invalid email or password",
    };
  }

  const { email, password } = parseResult.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/overview",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password. Please verify and try again." };
        default:
          return { error: "Authentication failed. Please try again." };
      }
    }
    // Next.js redirect errors MUST be re-thrown so Next.js can perform the navigation!
    throw error;
  }
}

/**
 * Start an isolated one-click guest demo session.
 */
export async function startDemoSession() {
  return signIn("demo", { redirectTo: "/overview" });
}

/**
 * Sign out of current session.
 */
export async function logoutSession() {
  return signOut({ redirectTo: "/" });
}
