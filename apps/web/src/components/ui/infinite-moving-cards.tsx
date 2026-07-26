"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export function InfiniteMovingCards({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
}: {
  items: { name: string; mark?: string }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    const scrollerContent = Array.from(scrollerRef.current.children);
    scrollerContent.forEach((item) => {
      const duplicated = item.cloneNode(true);
      scrollerRef.current?.appendChild(duplicated);
    });
    containerRef.current.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse",
    );
    const duration = speed === "fast" ? "28s" : speed === "slow" ? "70s" : "45s";
    containerRef.current.style.setProperty("--animation-duration", duration);
    setStart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_12%,white_88%,transparent)] dark:[mask-image:linear-gradient(to_right,transparent,#0a0e14_12%,#0a0e14_88%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item) => (
          <li
            key={item.name}
            className="relative flex w-[180px] shrink-0 items-center justify-center gap-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] px-6 py-4 backdrop-blur-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--page-bg-soft)] font-display text-sm text-[var(--accent)]">
              {item.mark ?? item.name.slice(0, 1)}
            </span>
            <span className="font-medium tracking-tight text-[var(--ink)]">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
