"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ParallaxContent, ParallaxScene, easeOut } from "./motion";

const childVariants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
};

/** Full-bleed scene - morning / night with scroll parallax */
export function SceneHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section className={cn("relative min-h-[100svh] overflow-hidden", className)}>
      <ParallaxScene>
        <Image
          src="/hermes-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-100 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-0"
          sizes="100vw"
          quality={90}
        />
        <Image
          src="/hermes-hero-night.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:opacity-100"
          sizes="100vw"
          quality={92}
        />
      </ParallaxScene>

      <div className="absolute inset-0 bg-gradient-to-r from-[#0f1a14]/78 via-[#0f1a14]/45 to-transparent dark:opacity-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)] via-transparent to-[#0f1a14]/25 dark:opacity-0" />

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[900ms] dark:opacity-100"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#050814]/70 via-[#050814]/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)] via-transparent to-[#0a1028]/25" />
        <motion.div
          className="absolute bottom-[28%] left-[35%] h-40 w-[50%] rounded-full bg-[#ffb35a]/12 blur-[80px]"
          animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[32%] right-[18%] h-28 w-40 rounded-full bg-[#6a8cff]/15 blur-[60px]"
          animate={reduce ? undefined : { opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
        <div className="stars absolute inset-x-0 top-0 h-[45%] opacity-70" />
      </div>

      <ParallaxContent
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-28 pt-28 md:justify-center md:pb-20"
        range={50}
      >
        <motion.div
          className="flex flex-col"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
          }}
        >
          {/* Clone-friendly: wrap each direct child via Children - page passes fragments of motion elements */}
          {children}
        </motion.div>
      </ParallaxContent>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28 bg-gradient-to-t from-[var(--page-bg)] via-[color-mix(in_srgb,var(--page-bg)_75%,transparent)] to-transparent sm:h-36" />
    </section>
  );
}

export { childVariants as heroChildVariants };
