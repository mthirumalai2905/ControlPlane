"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LogoGitHub,
  LogoPostgres,
  LogoSlack,
  LogoCursor,
  LogoFigma,
  LogoNotion,
} from "./BrandLogos";

/** Live fleet panel with sparkline + logos */
export function StatusSkeleton({ className }: { className?: string }) {
  const rows = [
    { name: "GitHub", Logo: LogoGitHub, status: "Healthy", ms: 42, tone: "ok" as const },
    { name: "Postgres", Logo: LogoPostgres, status: "Healthy", ms: 18, tone: "ok" as const },
    { name: "Slack", Logo: LogoSlack, status: "Repairing", ms: 210, tone: "warn" as const },
    { name: "Cursor", Logo: LogoCursor, status: "Healthy", ms: 31, tone: "ok" as const },
  ];

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[var(--page-bg)] to-[var(--page-bg-soft)] p-3",
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--faint)]">
          Fleet · live
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3a7348]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#3dd68c] opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#3dd68c]" />
          </span>
          99.98% uptime
        </span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.name}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2.5 backdrop-blur-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--page-bg-soft)] text-[var(--ink)]">
            <row.Logo className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--ink)]">{row.name}</span>
              <span className="font-mono text-[10px] text-[var(--faint)]">{row.ms}ms</span>
            </div>
            <div className="mt-1.5 flex items-end gap-0.5">
              {[40, 55, 35, 70, 45, 80, 60, 90, 50, 75, 65, 85].map((h, hi) => (
                <motion.span
                  key={hi}
                  className={cn(
                    "w-1 rounded-sm",
                    row.tone === "ok" ? "bg-[#2f5d3a]/50" : "bg-[#c4895e]/60",
                  )}
                  style={{ height: Math.max(4, (h / 100) * 12) }}
                  animate={{ height: [Math.max(4, (h / 100) * 10), Math.max(4, (h / 100) * 14), Math.max(4, (h / 100) * 10)] }}
                  transition={{ duration: 2 + (hi % 3) * 0.3, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
              row.tone === "ok"
                ? "bg-[#2f5d3a]/12 text-[#2f5d3a]"
                : "bg-[#c4895e]/15 text-[#8a5a18]",
            )}
          >
            {row.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** Streaming activity with cursor */
export function ActivitySkeleton({ className }: { className?: string }) {
  const steps = [
    { t: "12:04:01", s: "Matched intent → GitHub" },
    { t: "12:04:02", s: "Pulled @mcp/server-github" },
    { t: "12:04:04", s: "Auth vault · PAT injected" },
    { t: "12:04:06", s: "Validated 12 tools · Healthy" },
  ];
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0d1410] p-0",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#5c6b58]/50" />
        <span className="h-2 w-2 rounded-full bg-[#5c6b58]/35" />
        <span className="h-2 w-2 rounded-full bg-[#5c6b58]/25" />
        <span className="ml-2 font-mono text-[9px] text-[#7a8a76]">activity.stream</span>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2.5 p-3">
        {steps.map((row, i) => (
          <motion.div
            key={row.s}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.14 }}
            className="flex gap-2 font-mono text-[11px]"
          >
            <span className="shrink-0 text-[#4a5a48]">{row.t}</span>
            <span className={i === steps.length - 1 ? "text-[#e8efe6]" : "text-[#a8b5a4]"}>
              {row.s}
            </span>
          </motion.div>
        ))}
        <motion.div
          className="flex items-center gap-2 font-mono text-[11px] text-[#3a7348]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.3 }}
        >
          <span>›</span>
          <span className="h-3.5 w-px bg-[#e8efe6]" />
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d1410] to-transparent" />
    </div>
  );
}

/** Orbiting connector logos mosaic */
export function ConnectorMosaic({ className }: { className?: string }) {
  const logos = [
    { Logo: LogoGitHub, c: "bg-[#1a2218] text-white" },
    { Logo: LogoSlack, c: "bg-[#4A154B] text-white" },
    { Logo: LogoPostgres, c: "bg-[#336791] text-white" },
    { Logo: LogoNotion, c: "bg-white text-[#1a2218] border border-[var(--line)]" },
    { Logo: LogoFigma, c: "bg-[#1a2218] text-white" },
    { Logo: LogoCursor, c: "bg-[#2f5d3a] text-white" },
  ];
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[var(--page-bg)] via-[var(--page-bg-soft)] to-[var(--page-bg)] p-4",
        className,
      )}
    >
      <motion.div
        className="absolute h-28 w-28 rounded-full border border-dashed border-[var(--line)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-40 w-40 rounded-full border border-[var(--line)]/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative grid grid-cols-3 gap-2">
        {logos.map(({ Logo, c }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 260 }}
            whileHover={{ y: -3, scale: 1.06 }}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl shadow-md",
              c,
            )}
          >
            <Logo className="h-5 w-5" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Circular lifecycle with sweeping progress */
export function PipelineStrip({ className }: { className?: string }) {
  const steps = ["Discover", "Install", "Auth", "Validate", "Heal"];
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[var(--page-bg)] to-[var(--page-bg-soft)] p-4",
        className,
      )}
    >
      <svg viewBox="0 0 200 200" className="absolute h-44 w-44 opacity-80">
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="none"
          stroke="currentColor"
          className="text-[var(--line)]"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <motion.circle
          cx="100"
          cy="100"
          r="72"
          fill="none"
          stroke="#2f5d3a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="452"
          initial={{ strokeDashoffset: 452 }}
          whileInView={{ strokeDashoffset: 80 }}
          viewport={{ once: true }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="relative z-10 text-center">
        <motion.p
          className="font-display text-3xl text-[var(--ink)]"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          5
        </motion.p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--faint)]">
          stages
        </p>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex justify-between gap-1">
        {steps.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="rounded-full bg-[var(--glass)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--muted)] backdrop-blur-sm"
          >
            {s}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/** Vault with concentric rings */
export function SecretsVault({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#0d1410] p-4",
        className,
      )}
    >
      {[1, 2, 3].map((r) => (
        <motion.div
          key={r}
          className="absolute rounded-full border border-[#3a7348]/30"
          style={{ width: r * 36 + 40, height: r * 36 + 40 }}
          animate={{ rotate: r % 2 ? 360 : -360, opacity: [0.3, 0.7, 0.3] }}
          transition={{
            rotate: { duration: 12 + r * 4, repeat: Infinity, ease: "linear" },
            opacity: { duration: 3 + r, repeat: Infinity },
          }}
        />
      ))}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex h-16 w-14 flex-col items-center justify-center rounded-xl border border-[#3a7348]/50 bg-gradient-to-b from-[#243028] to-[#152018] shadow-[0_0_30px_rgba(47,93,58,0.35)]"
      >
        <div className="absolute -top-2 h-3 w-7 rounded-full border-2 border-[#5a9a68]" />
        <span className="font-mono text-[10px] tracking-widest text-[#a8b5a4]">••••</span>
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5a9a68]">
          AES-256
        </span>
      </motion.div>
    </div>
  );
}

/** Animated before/after meters */
export function ComparePanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid flex-1 grid-cols-2 gap-3 rounded-xl bg-gradient-to-br from-[var(--page-bg)] to-[var(--page-bg-soft)] p-3",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-xl border border-[#e0c4c4]/80 bg-[#faf6f6]/90 p-4 dark:border-red-900/40 dark:bg-red-950/20">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#b85c5c]">Before</p>
        <motion.p
          className="mt-2 font-display text-3xl text-[var(--ink)]"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          2-3h
        </motion.p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">manual config grind</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e0c4c4]/50">
          <motion.div
            className="h-full rounded-full bg-[#b85c5c]"
            initial={{ width: 0 }}
            whileInView={{ width: "92%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-[#c5d0bc] bg-white/90 p-4 dark:border-[#2f5d3a]/50 dark:bg-[#1a2218]/60">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#2f5d3a]">After</p>
        <motion.p
          className="mt-2 font-display text-3xl text-[#2f5d3a] dark:text-[#5a9a68]"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          ~5m
        </motion.p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">say “Install GitHub”</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#c5d0bc]/50">
          <motion.div
            className="h-full rounded-full bg-[#2f5d3a]"
            initial={{ width: 0 }}
            whileInView={{ width: "18%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
