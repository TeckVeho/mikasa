"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ActingTenantProvider } from "@/contexts/ActingTenantContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <ActingTenantProvider>{children}</ActingTenantProvider>
    </QueryClientProvider>
  );
}
