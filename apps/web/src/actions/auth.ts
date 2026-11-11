"use server";

import { signIn, signOut } from "@/auth";

export async function startDemoSession() {
  return signIn("demo", { redirectTo: "/overview" });
}

export async function loginWithGoogle() {
  return signIn("google", { redirectTo: "/overview" });
}

export async function logoutSession() {
  return signOut({ redirectTo: "/" });
}
