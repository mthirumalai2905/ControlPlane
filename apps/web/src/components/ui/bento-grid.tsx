"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { easeOut } from "@/components/landing/motion";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(
        "mx-auto grid max-w-6xl grid-cols-1 gap-4 md:auto-rows-[24rem] md:grid-cols-3",
        className,
      )}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-8%" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 36, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.65, ease: easeOut },
        },
      }}
      whileHover={reduce ? undefined : { y: -6, transition: { duration: 0.35 } }}
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] p-4 backdrop-blur-xl will-change-transform hover:border-[var(--accent)] hover:bg-white/70 dark:hover:bg-white/10",
        className,
      )}
    >
      <div className="min-h-0 flex-1">{header}</div>
      <motion.div
        className="transition duration-200 group-hover/bento:translate-x-1"
        whileHover={reduce ? undefined : { x: 4 }}
      >
        {icon}
        <div className="mt-2 mb-1 font-medium text-[var(--ink)]">{title}</div>
        <div className="text-sm leading-relaxed text-[var(--muted)]">{description}</div>
      </motion.div>
    </motion.div>
  );
}
