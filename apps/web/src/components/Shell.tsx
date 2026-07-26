"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/registry", label: "Marketplace" },
  { href: "/servers", label: "Connectors" },
  { href: "/activity", label: "AI Activity" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/logs", label: "Logs" },
  { href: "/secrets", label: "Secrets" },
  { href: "/settings", label: "Settings" },
];

function WorkspaceBadge() {
  const { workspace, loading } = useWorkspace();
  if (loading) return <span className="text-xs text-[var(--faint)]">Loading…</span>;
  return (
    <span className="truncate max-w-[140px] font-mono text-xs text-[var(--muted)]" title={workspace?.id}>
      {workspace?.name ?? "No workspace"}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
        <aside className="flex w-56 shrink-0 flex-col gap-8 border-r border-[var(--line)] bg-[var(--page-bg-soft)]/80 px-4 py-6 backdrop-blur-sm">
          <div>
            <Link href="/" className="block">
              <span className="font-display text-2xl tracking-tight text-[var(--ink)]">Control Plane</span>
            </Link>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--faint)]">
              AI Integration OS
            </p>
            <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--glass)] px-2 py-1.5">
              <WorkspaceBadge />
            </div>
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--ink)] text-[var(--page-bg)]"
                      : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 pb-16">
            <Link
              href="/"
              className="block text-xs text-[var(--faint)] transition hover:text-[var(--accent)]"
            >
              ← Marketing site
            </Link>
            <p className="font-mono text-[10px] text-[var(--faint)]">MVP · meadow console</p>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}
