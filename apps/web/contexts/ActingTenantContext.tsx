"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  clearActingTenantId,
  getActingTenantId,
  setActingTenantHeaderEnabled,
  setActingTenantId as persistActingTenantId,
} from "@/lib/acting-tenant";
import { isSuperAdminRole } from "@/lib/roles";

type ActingTenantContextValue = {
  actingTenantId: string | null;
  setActingTenantId: (id: string) => void;
  resetToHomeTenant: () => void;
  isSuperAdmin: boolean;
};

const ActingTenantContext = createContext<ActingTenantContextValue | null>(null);

export function ActingTenantProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const [actingTenantId, setState] = useState<string | null>(null);

  useEffect(() => {
    setActingTenantHeaderEnabled(isSuperAdmin);
    return () => setActingTenantHeaderEnabled(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!user) return;
    if (!isSuperAdmin) {
      clearActingTenantId();
      setState(null);
      return;
    }
    const stored = getActingTenantId();
    const initial = stored ?? user.tenantId;
    setState(initial);
    if (!stored) {
      persistActingTenantId(initial);
    }
  }, [user, isSuperAdmin]);

  const setActingTenantId = useCallback(
    (id: string) => {
      persistActingTenantId(id);
      setState(id);
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const resetToHomeTenant = useCallback(() => {
    if (!user) return;
    persistActingTenantId(user.tenantId);
    setState(user.tenantId);
    void queryClient.invalidateQueries();
  }, [user, queryClient]);

  return (
    <ActingTenantContext.Provider
      value={{ actingTenantId, setActingTenantId, resetToHomeTenant, isSuperAdmin }}
    >
      {children}
    </ActingTenantContext.Provider>
  );
}

export function useActingTenant(): ActingTenantContextValue {
  const ctx = useContext(ActingTenantContext);
  if (!ctx) {
    throw new Error("useActingTenant must be used within ActingTenantProvider");
  }
  return ctx;
}
