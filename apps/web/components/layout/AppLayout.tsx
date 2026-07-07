import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Breadcrumb } from "./Breadcrumb";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Suspense fallback={<aside className="sticky top-0 h-screen w-56 shrink-0 border-r border-border bg-sidebar" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">
        <div className="w-full px-5 py-6 lg:px-8">
          <Suspense fallback={null}>
            <Breadcrumb />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
