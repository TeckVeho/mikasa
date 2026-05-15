import type { QueryClient } from "@tanstack/react-query";

/** ログアウト時にセッション由来の React Query キャッシュを削除 */
export function resetSessionCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: ["current-user"] });
  queryClient.removeQueries({ queryKey: ["admin"] });
}
