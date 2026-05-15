"use client";

import { useEffect, useState } from "react";
import { subscribeAuth } from "@/lib/auth";
import { getDevAuthUserId, shouldUseDevAuth } from "@/lib/dev-auth";

export function useAuthUser() {
  const devAuth = shouldUseDevAuth();
  const [authUid, setAuthUid] = useState<string | null>(() =>
    devAuth ? getDevAuthUserId() : null,
  );
  const [authReady, setAuthReady] = useState(devAuth);

  useEffect(() => {
    if (devAuth) {
      setAuthUid(getDevAuthUserId());
      setAuthReady(true);
      return;
    }
    return subscribeAuth((user) => {
      setAuthUid(user?.uid ?? null);
      setAuthReady(true);
    });
  }, [devAuth]);

  return { authUid, authReady, isDevAuth: devAuth };
}
