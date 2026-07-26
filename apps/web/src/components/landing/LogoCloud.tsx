"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { TRUST_BRANDS } from "./BrandLogos";

export function LogoCloud({
  direction = "left",
  speed = "slow",
  className,
}: {
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    Array.from(scrollerRef.current.children).forEach((item) => {
      scrollerRef.current?.appendChild(item.cloneNode(true));
    });
    containerRef.current.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse",
    );
    containerRef.current.style.setProperty(
      "--animation-duration",
      speed === "fast" ? "32s" : speed === "slow" ? "55s" : "42s",
    );
    setStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)] dark:[mask-image:linear-gradient(to_right,transparent,#0a0e14_10%,#0a0e14_90%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap items-center gap-3 py-3",
          start && "animate-scroll",
        )}
      >
        {TRUST_BRANDS.map(({ name, Logo }) => (
          <li
            key={name}
            className="group relative flex h-14 w-[168px] shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] px-5 backdrop-blur-xl transition hover:border-[var(--accent)]"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-60 dark:from-white/5" />
            <Logo className="relative h-5 w-5 text-[var(--ink)] opacity-80 transition group-hover:opacity-100" />
            <span className="relative font-medium tracking-tight text-[var(--ink)]">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
