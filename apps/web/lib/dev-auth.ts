/** Dev 認証（Firebase なし）の判定。api / hooks で共有 */
export function shouldUseDevAuth(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") return true;
  const host = window.location.hostname;
  // GCP dev custom domains (e.g. mikasa.vw-dev.com) — no Firebase required
  if (host.endsWith(".vw-dev.com")) return true;
  return (
    process.env.NODE_ENV === "development" &&
    (host === "localhost" || host === "127.0.0.1")
  );
}

export function getDevAuthUserId(): string {
  return process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user";
}
