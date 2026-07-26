"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/arena", label: "Lab" },
  { href: "/lab/monitor", label: "Monitor" },
  { href: "/registry", label: "Connectors" },
  { href: "/servers", label: "Installed" },
  { href: "/activity", label: "Activity" },
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
  const isLab = pathname.startsWith("/arena");

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--sidebar)] px-3 py-4">
          <div className="px-2 pb-4">
            <Link href="/" className="block">
              <span className="font-display text-xl tracking-tight text-[var(--ink)]">Control Plane</span>
            </Link>
            <p className="mt-0.5 text-[11px] text-[var(--faint)]">AI Integration OS</p>
            <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5">
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
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-[var(--surface)] font-medium text-[var(--ink)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                      : "text-[var(--muted)] hover:bg-[var(--page-bg-soft)] hover:text-[var(--ink)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 px-2 pb-16 pt-6">
            <Link
              href="/"
              className="block text-xs text-[var(--faint)] transition hover:text-[var(--ink)]"
            >
              Marketing site
            </Link>
          </div>
        </aside>
        <main
          className={cn(
            "min-w-0 flex-1 bg-[var(--page-bg)]",
            isLab ? "overflow-hidden" : "overflow-auto",
          )}
        >
          <div className={cn(isLab ? "h-[100dvh]" : "mx-auto max-w-7xl px-8 py-8")}>{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}
