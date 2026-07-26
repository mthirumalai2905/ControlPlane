"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { markFor } from "@/lib/catalog";

type Props = {
  name: string;
  slug: string;
  description: string;
  classification?: string;
  tier?: string;
  category?: string;
  auth?: string;
  tools?: string[];
  tags?: string[];
  installed?: boolean;
  index?: number;
  icon?: React.ReactNode;
  disableEnterAnimation?: boolean;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  className?: string;
};

export function GlassConnectorCard({
  name,
  slug,
  description,
  classification = "official",
  tier,
  category,
  auth,
  tools = [],
  tags = [],
  installed,
  index = 0,
  icon,
  disableEnterAnimation,
  primaryAction,
  secondaryAction,
  className,
}: Props) {
  return (
    <motion.article
      initial={disableEnterAnimation ? false : { opacity: 0, y: 16 }}
      whileInView={disableEnterAnimation ? undefined : { opacity: 1, y: 0 }}
      viewport={disableEnterAnimation ? undefined : { once: true, margin: "-24px" }}
      transition={{ delay: Math.min(index * 0.04, 0.28), duration: 0.35 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)]",
        "bg-[var(--glass)] p-5 shadow-[0_8px_32px_rgba(26,34,24,0.06)] backdrop-blur-xl",
        "transition duration-300 hover:border-[var(--accent)] hover:bg-white/70 dark:hover:bg-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#2f5d3a]/8 blur-2xl transition group-hover:bg-[#2f5d3a]/14" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--page-bg-soft)] to-[var(--glass)] text-[var(--ink)] shadow-sm">
          {icon ?? (
            <span className="font-mono text-xs font-medium text-[var(--accent)]">{markFor(name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-base font-medium text-[var(--ink)]">{name}</h3>
            {installed && (
              <span className="rounded-full bg-[#2f5d3a]/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#2f5d3a]">
                Installed
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[#8a9a84]">{slug}</p>
        </div>
      </div>

      <p className="relative mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-[#d5ddd0]/80 bg-white/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#5c6b58]">
          {classification}
        </span>
        {tier && (
          <span className="rounded-full border border-[#d5ddd0]/80 bg-white/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#5c6b58]">
            {tier}
          </span>
        )}
        {category && (
          <span className="rounded-full border border-[#d5ddd0]/80 bg-white/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#5c6b58]">
            {category}
          </span>
        )}
        {auth && auth !== "none" && (
          <span className="rounded-full border border-[#e8d5b0] bg-[#faf6ee]/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#8a5a18]">
            {auth}
          </span>
        )}
      </div>

      {tools.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1">
          {tools.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-[#1a2218]/5 px-1.5 py-0.5 font-mono text-[10px] text-[#5c6b58]"
            >
              {t}
            </span>
          ))}
          {tools.length > 3 && (
            <span className="px-1 font-mono text-[10px] text-[#8a9a84]">+{tools.length - 3}</span>
          )}
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="relative mt-4 flex flex-wrap gap-2 border-t border-[#d5ddd0]/60 pt-4">
          {primaryAction && (
            <button
              type="button"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
              className="console-btn-accent text-xs"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction?.href && (
            <a
              href={secondaryAction.href}
              target="_blank"
              rel="noreferrer"
              className="console-btn-ghost text-xs"
            >
              {secondaryAction.label}
            </a>
          )}
          {secondaryAction?.onClick && !secondaryAction.href && (
            <button type="button" onClick={secondaryAction.onClick} className="console-btn-ghost text-xs">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {tags.length > 0 && !primaryAction && (
        <div className="relative mt-3 flex flex-wrap gap-1 opacity-70">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-[#8a9a84]">
              #{t}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
