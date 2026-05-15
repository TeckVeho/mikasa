"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isSuperAdminRole } from "@/lib/roles";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError, isFetched } = useCurrentUser();

  useEffect(() => {
    if (!isFetched || isLoading) return;
    if (isError || !isSuperAdminRole(user?.role)) {
      const fallback = user?.role === "operator" ? "/operator" : "/dashboard";
      router.replace(fallback);
    }
  }, [user?.role, isLoading, isError, isFetched, router]);

  if (!isFetched || isLoading || !isSuperAdminRole(user?.role)) {
    return null;
  }

  return children;
}
