"use client";

import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const r = await apiJson<CurrentUser>("/v1/auth/me");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
