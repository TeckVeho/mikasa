"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function LpRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authUid, authReady, isDevAuth } = useAuthUser();

  useEffect(() => {
    if (!authReady || isDevAuth) return;
    if (authUid) router.replace("/dashboard");
  }, [authReady, authUid, isDevAuth, router]);

  if (!authReady) return <LoadingScreen />;
  if (authUid && !isDevAuth) return <LoadingScreen />;

  return children;
}
