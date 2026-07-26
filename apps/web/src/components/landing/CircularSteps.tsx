"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { easeOut } from "./motion";

const STEPS = [
  { n: "01", t: "Discover", d: "Match intent to the marketplace connector." },
  { n: "02", t: "Install", d: "Sandboxed download, deps, and config generation." },
  { n: "03", t: "Validate", d: "Health check + tool discovery before Healthy." },
  { n: "04", t: "Heal", d: "Crashes and auth drift repaired automatically." },
];

export function CircularSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const trackX = useTransform(scrollYProgress, [0.2, 0.8], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mt-14">
      {/* progress line under steps on desktop */}
      <div className="pointer-events-none absolute left-0 right-0 top-[4.25rem] hidden h-px bg-[var(--line)] lg:block" />
      <motion.div
        className="pointer-events-none absolute left-0 top-[4.25rem] hidden h-px origin-left bg-[var(--accent)] lg:block"
        style={reduce ? undefined : { width: trackX }}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            initial={reduce ? false : { opacity: 0, y: 28, rotateX: 8 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ delay: i * 0.12, duration: 0.65, ease: easeOut }}
            whileHover={reduce ? undefined : { y: -8, transition: { duration: 0.35 } }}
            className="group relative"
            style={{ perspective: 800 }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass)] p-6 backdrop-blur-xl hover:border-[var(--accent)] hover:shadow-[0_20px_50px_rgba(26,34,24,0.12)]">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <motion.span
                  className="absolute inset-0 rounded-full border border-[var(--line)]"
                  whileHover={{ scale: 1.1 }}
                />
                <motion.span
                  className="absolute inset-1 rounded-full border border-dashed border-[var(--accent)]/40"
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative font-display text-xl text-[var(--accent)]">{step.n}</span>
              </div>
              <p className="font-heading text-lg font-medium tracking-calm text-[var(--ink)]">
                {step.t}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.d}</p>
              <motion.div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/5 blur-2xl"
                animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
