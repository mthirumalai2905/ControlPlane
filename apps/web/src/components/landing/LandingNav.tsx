"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { easeOut } from "@/components/landing/motion";

const LINKS = [
  { label: "Product", id: "capabilities" },
  { label: "How it works", id: "how-it-works" },
  { label: "Connectors", id: "connectors" },
  { label: "Trust", id: "trust" },
] as const;

function BrandMark({ ink }: { ink: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex items-center gap-2.5 tracking-tight transition-colors",
        ink ? "text-[var(--ink)]" : "text-white",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-semibold leading-none",
          ink
            ? "border-[var(--line)] bg-[var(--page-bg-soft)] text-[var(--accent)]"
            : "border-white/30 bg-white/10 text-white backdrop-blur-sm",
        )}
        aria-hidden
      >
        CP
      </span>
      <span className="font-display text-xl sm:text-2xl">Control Plane</span>
    </Link>
  );
}

export function LandingNav() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 48));
    return () => unsub();
  }, [scrollY]);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const goTo = useCallback((id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const solid = scrolled || open;

  return (
    <>
      <motion.header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter,box-shadow] duration-500",
          solid
            ? "border-b border-[var(--line)]/80 bg-[var(--page-bg)]/85 shadow-[0_8px_30px_rgba(15,26,20,0.06)] backdrop-blur-xl dark:bg-[var(--page-bg)]/80 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            : "border-b border-transparent bg-transparent",
        )}
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: easeOut, delay: 0.15 }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <BrandMark ink={solid} />

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => goTo(link.id)}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                    solid
                      ? isActive
                        ? "text-[var(--ink)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                      : isActive
                        ? "text-white"
                        : "text-white/75 hover:text-white",
                  )}
                >
                  {link.label}
                  {isActive ? (
                    <motion.span
                      layoutId="nav-underline"
                      className={cn(
                        "absolute inset-x-3 -bottom-0.5 h-px",
                        solid ? "bg-[var(--accent)]" : "bg-white/80",
                      )}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className={cn(
                "hidden text-sm transition-colors sm:inline",
                solid
                  ? "text-[var(--muted)] hover:text-[var(--ink)]"
                  : "text-white/80 hover:text-white",
              )}
            >
              Console
            </Link>
            <Link
              href="/registry"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                solid
                  ? "bg-[var(--ink)] text-[var(--page-bg)] hover:opacity-90"
                  : "bg-white text-[#1a2218] hover:bg-white/90",
              )}
            >
              Marketplace
            </Link>

            <button
              type="button"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md md:hidden",
                solid
                  ? "text-[var(--ink)] hover:bg-[var(--page-bg-soft)]"
                  : "text-white hover:bg-white/10",
              )}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative block h-3.5 w-4">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    open && "translate-y-[6px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[6px] h-0.5 w-full rounded-full bg-current transition-opacity duration-200",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[12px] h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    open && "-translate-y-[6px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#0f1a14]/45 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              className="absolute inset-x-0 top-16 border-b border-[var(--line)] bg-[var(--page-bg)] px-5 py-4 shadow-lg"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOut }}
              aria-label="Mobile"
            >
              <ul className="flex flex-col gap-1">
                {LINKS.map((link) => (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => goTo(link.id)}
                      className={cn(
                        "w-full rounded-md px-3 py-3 text-left text-base transition-colors",
                        active === link.id
                          ? "bg-[var(--page-bg-soft)] text-[var(--ink)]"
                          : "text-[var(--muted)] hover:bg-[var(--page-bg-soft)] hover:text-[var(--ink)]",
                      )}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
                <li className="mt-2 border-t border-[var(--line)] pt-3">
                  <Link
                    href="/dashboard"
                    className="block rounded-md px-3 py-3 text-[var(--muted)] hover:text-[var(--ink)]"
                    onClick={() => setOpen(false)}
                  >
                    Open console
                  </Link>
                </li>
              </ul>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
