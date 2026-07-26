"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { easeOut } from "@/components/landing/motion";

export function MeadowFooter() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["18%", "0%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const contentY = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const contentOpacity = useTransform(scrollYProgress, [0.15, 0.55], [0, 1]);

  return (
    <footer ref={ref} className="relative overflow-hidden">
      <div className="relative min-h-[320px] sm:min-h-[420px] md:min-h-[480px]">
        <motion.div
          className="absolute inset-[-10%] will-change-transform"
          style={reduce ? undefined : { y, scale }}
        >
          <Image
            src="/hermes-footer-meadow.jpg"
            alt=""
            fill
            className="object-cover object-[center_65%] opacity-100 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-0"
            sizes="100vw"
            quality={90}
            priority={false}
          />
          <Image
            src="/hermes-footer-night.jpg"
            alt=""
            fill
            className="object-cover object-[center_65%] opacity-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-100"
            sizes="100vw"
            quality={92}
            priority={false}
          />
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[900ms] dark:opacity-100"
          aria-hidden
        >
          <div className="absolute bottom-[30%] left-1/2 h-36 w-[60%] -translate-x-1/2 rounded-full bg-[#ffb35a]/14 blur-[70px]" />
          <div className="stars absolute inset-x-0 top-0 h-[40%] opacity-60" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-[var(--page-bg)] via-[color-mix(in_srgb,var(--page-bg)_70%,transparent)] to-transparent sm:h-36" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-[color-mix(in_srgb,var(--page-bg)_90%,transparent)] to-transparent" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1a14]/80 via-[#0f1a14]/20 to-transparent dark:from-[#050814]/75 dark:via-[#050814]/15 dark:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1a14]/20 via-transparent to-[#0f1a14]/15 dark:from-[#050814]/25 dark:to-transparent" />

        <motion.div
          className="relative z-10 mx-auto flex min-h-[320px] sm:min-h-[420px] md:min-h-[480px] max-w-6xl flex-col justify-end px-6 pb-10 pt-24"
          style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <Link href="/" className="font-display text-2xl tracking-tight text-white drop-shadow-sm">
                Control Plane
              </Link>
              <p className="mt-2 max-w-md text-sm text-white/80">
                AI Integration Operating System — secure, autonomous access to every enterprise
                system.
              </p>
            </div>
            <p className="text-xs font-mono text-white/55">
              <span className="dark:hidden">Township meadows · morning light</span>
              <span className="hidden dark:inline">Township nights · city glow</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
