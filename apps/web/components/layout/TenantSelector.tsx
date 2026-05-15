"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { apiJson } from "@/lib/api";
import { useActingTenant } from "@/contexts/ActingTenantContext";
import { isSuperAdminRole } from "@/lib/roles";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-text outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

type TenantRow = {
  id: string;
  name: string;
};

export function TenantSelector({ collapsed }: { collapsed: boolean }) {
  const { data: user, isLoading, isFetched } = useCurrentUser();
  const { actingTenantId, setActingTenantId, isSuperAdmin } = useActingTenant();
  const canSelectTenant =
    isSuperAdmin &&
    isFetched &&
    !isLoading &&
    isSuperAdminRole(user?.role);

  const q = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async () => {
      const r = await apiJson<TenantRow[]>("/v1/admin/tenants");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: canSelectTenant,
  });

  if (!canSelectTenant) return null;

  const selectedName =
    q.data?.find((t) => t.id === actingTenantId)?.name ?? "テナント";

  if (collapsed) {
    return (
      <div className="group relative flex justify-center px-2 pb-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/5 hover:text-text"
          title={selectedName}
        >
          <Building2 className="h-4 w-4 shrink-0" />
        </div>
        <div
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
        >
          {selectedName}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-3">
      <label htmlFor="tenant-selector" className="mb-1 block text-xs text-muted">
        テナント
      </label>
      <select
        id="tenant-selector"
        value={actingTenantId ?? ""}
        onChange={(e) => setActingTenantId(e.target.value)}
        disabled={q.isLoading || q.isError}
        className={cn(SELECT_CLASS, q.isLoading && "opacity-60")}
      >
        {q.isLoading ? (
          <option value="">読み込み中…</option>
        ) : q.isError ? (
          <option value="">取得失敗</option>
        ) : (
          (q.data ?? []).map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
