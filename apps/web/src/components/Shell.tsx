"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/registry", label: "Registry" },
  { href: "/servers", label: "Servers" },
  { href: "/activity", label: "AI Activity" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/workflows", label: "Workflows" },
  { href: "/logs", label: "Logs" },
  { href: "/secrets", label: "Secrets" },
  { href: "/users", label: "Users" },
  { href: "/settings", label: "Settings" },
];

function WorkspaceBadge() {
  const { workspace, loading } = useWorkspace();
  if (loading) return <span className="text-mist-400 text-xs">Loading…</span>;
  return (
    <span className="font-mono text-xs text-mist-200 truncate max-w-[140px]" title={workspace?.id}>
      {workspace?.name ?? "No workspace"}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-ink-950 text-mist-100">
        <aside className="w-56 shrink-0 border-r border-ink-700/80 bg-ink-900/40 px-4 py-6 flex flex-col gap-8">
          <div>
            <Link href="/" className="block">
              <span className="font-display text-2xl tracking-tight text-accent">Hermes</span>
            </Link>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-mist-400">
              Control Plane
            </p>
            <div className="mt-3 panel rounded-md px-2 py-1.5">
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
                      ? "bg-ink-800 text-accent"
                      : "text-mist-200 hover:bg-ink-800/60 hover:text-mist-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-auto text-[10px] text-mist-400 font-mono">Phase 0 · foundation</p>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}
