import { AppShell } from "@/components/layout/AppShell";
import { StatusBar } from "@/components/layout/StatusBar";
import { getCurrentUser } from "@/lib/auth-helpers";
import React from "react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AppShell user={user || undefined}>
      <StatusBar isDemoUser={user?.isDemo} />
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </div>
    </AppShell>
  );
}
