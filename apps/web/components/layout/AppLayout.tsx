import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Breadcrumb } from "./Breadcrumb";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Suspense fallback={<aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-border bg-sidebar" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <Suspense fallback={null}>
            <Breadcrumb />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
