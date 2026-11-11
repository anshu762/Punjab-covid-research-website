import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@epilens/shared";
import { authConfig } from "./auth.config";
import { db } from "./lib/db";
import { seedDemoData } from "./lib/demo";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isDemo: boolean;
      demoExpiresAt?: Date | string | null;
    } & DefaultSession["user"];
  }

  interface User {
    isDemo?: boolean;
    demoExpiresAt?: Date | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parseResult = LoginSchema.safeParse(credentials);
        if (!parseResult.success) {
          return null;
        }

        const { email, password } = parseResult.data;
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isDemo: user.isDemo,
          demoExpiresAt: user.demoExpiresAt,
        };
      },
    }),
    Credentials({
      id: "demo",
      name: "Demo Account",
      credentials: {},
      async authorize() {
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const demoExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await db.user.create({
          data: {
            name: "Demo Researcher",
            email: `demo-${randomSuffix}@demo.epilens.local`,
            isDemo: true,
            demoExpiresAt,
          },
        });

        // Best effort demo data seed (8s timeout, never throws)
        try {
          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("Seed timeout")), 8000)
          );
          await Promise.race([seedDemoData(user.id), timeoutPromise]);
        } catch (e) {
          console.warn("Demo seeding skipped or timed out:", e);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isDemo: user.isDemo,
          demoExpiresAt: user.demoExpiresAt,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isDemo = user.isDemo ?? false;
        token.demoExpiresAt = user.demoExpiresAt
          ? user.demoExpiresAt.toISOString()
          : null;
      }

      // Check if demo user expired
      if (token.isDemo && typeof token.demoExpiresAt === "string") {
        const expiresAt = new Date(token.demoExpiresAt).getTime();
        if (Date.now() > expiresAt) {
          return null as unknown as typeof token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        session.user.isDemo = (token.isDemo as boolean) ?? false;
        session.user.demoExpiresAt = token.demoExpiresAt
          ? new Date(token.demoExpiresAt as string)
          : null;
      }
      return session;
    },
  },
});
