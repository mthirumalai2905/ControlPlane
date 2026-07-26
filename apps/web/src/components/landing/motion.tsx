"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut },
  },
};

export const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

/** Scroll-linked vertical parallax wrapper */
export function Parallax({
  children,
  speed = 0.25,
  className,
}: {
  children: ReactNode;
  /** Positive = moves slower / up as you scroll (classic parallax) */
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [speed * 80, speed * -80]);
  const y = useSpring(raw, { stiffness: 90, damping: 28, mass: 0.4 });

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Background layer that scales + shifts on scroll (hero/footer scenes) */
export function ParallaxScene({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.55]);

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-[-12%] will-change-transform"
        style={reduce ? undefined : { y, scale, opacity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Content that drifts opposite the background (depth) */
export function ParallaxContent({
  children,
  className,
  range = 40,
}: {
  children: ReactNode;
  className?: string;
  range?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, range]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { y, opacity }}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
} & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-10% 0px -8% 0px" }}
      transition={{ duration: 0.75, delay, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealText({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "h2" | "h3" | "p" | "span";
}) {
  const reduce = useReducedMotion();
  const shared = {
    className,
    initial: reduce ? false : ({ opacity: 0, y: 22, filter: "blur(6px)" } as const),
    whileInView: reduce ? undefined : ({ opacity: 1, y: 0, filter: "blur(0px)" } as const),
    viewport: { once: true, margin: "-12% 0px" as const },
    transition: { duration: 0.8, delay, ease: easeOut },
  };

  if (as === "h2") return <motion.h2 {...shared}>{children}</motion.h2>;
  if (as === "h3") return <motion.h3 {...shared}>{children}</motion.h3>;
  if (as === "p") return <motion.p {...shared}>{children}</motion.p>;
  if (as === "span") return <motion.span {...shared}>{children}</motion.span>;
  return <motion.div {...shared}>{children}</motion.div>;
}

export function FloatingOrb({
  className,
  drift = 30,
}: {
  className?: string;
  drift?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      animate={
        reduce
          ? undefined
          : {
              y: [0, -drift, 0, drift * 0.6, 0],
              x: [0, drift * 0.4, 0, -drift * 0.3, 0],
              scale: [1, 1.08, 1, 0.96, 1],
            }
      }
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function useSectionProgress(offset?: [string, string]): {
  ref: React.RefObject<HTMLElement | null>;
  progress: MotionValue<number>;
} {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: (offset as ["start end", "end start"]) || ["start end", "end start"],
  });
  return { ref, progress: scrollYProgress };
}
