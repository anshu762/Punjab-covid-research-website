import { auth } from "@/auth";
import { HttpError } from "./http";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  isDemo: boolean;
  demoExpiresAt?: Date | string | null;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    isDemo: !!session.user.isDemo,
    demoExpiresAt: session.user.demoExpiresAt,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in required to perform this action");
  }
  return user;
}

export function assertOwner(resourceOwnerId: string, user: AuthenticatedUser): void {
  if (resourceOwnerId !== user.id) {
    throw new HttpError(403, "FORBIDDEN", "You do not have access to this resource");
  }
}
