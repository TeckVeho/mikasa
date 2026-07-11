"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function TeamDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("team", id);
    const month = searchParams.get("month");
    if (month) params.set("month", month);
    const hash = window.location.hash;
    router.replace(`/teams?${params.toString()}${hash}`);
  }, [id, router, searchParams]);

  return <Skeleton className="h-64" />;
}

export default function TeamDetailRedirectPageWithSuspense({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <TeamDetailRedirectPage params={params} />
    </Suspense>
  );
}
