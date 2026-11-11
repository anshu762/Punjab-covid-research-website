import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isPublicPath =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/dev") ||
        pathname.startsWith("/_next") ||
        pathname.includes(".");

      if (isPublicPath) {
        return true;
      }

      if (!isLoggedIn) {
        return false; // Redirect to /login
      }

      return true;
    },
  },
  providers: [], // Overridden in auth.ts
};
