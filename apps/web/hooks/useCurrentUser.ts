"use client";

import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useAuthUser } from "./useAuthUser";

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
};

export function useCurrentUser() {
  const { authUid, authReady } = useAuthUser();

  return useQuery({
    queryKey: ["current-user", authUid],
    queryFn: async () => {
      const r = await apiJson<CurrentUser>("/v1/auth/me");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: authReady && Boolean(authUid),
    staleTime: 0,
    retry: 1,
  });
}
