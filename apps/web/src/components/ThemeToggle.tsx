"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, ready, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      aria-label={isDark ? "Switch to morning light" : "Switch to city night"}
      title={isDark ? "Morning light" : "City night"}
      disabled={!ready}
      onClick={(e) => toggleTheme({ clientX: e.clientX, clientY: e.clientY })}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: ready ? 1 : 0, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "group fixed bottom-5 left-5 z-[60] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full",
        "border border-white/50 shadow-[0_12px_40px_rgba(15,26,20,0.25)] backdrop-blur-xl",
        "transition-[box-shadow,border-color] duration-500",
        isDark
          ? "bg-[#12181f]/80 border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          : "bg-white/70",
        className,
      )}
    >
      {/* soft glow */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full opacity-60 transition-opacity duration-700",
          isDark
            ? "bg-[radial-gradient(circle_at_30%_30%,rgba(120,160,255,0.35),transparent_65%)]"
            : "bg-[radial-gradient(circle_at_30%_30%,rgba(255,210,120,0.45),transparent_65%)]",
        )}
      />

      <span className="relative h-7 w-7">
        {/* Sun */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            rotate: isDark ? -40 : 0,
            scale: isDark ? 0.35 : 1,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#c4895e]" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6" />
            </g>
          </svg>
        </motion.span>

        {/* Moon */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            rotate: isDark ? 0 : 40,
            scale: isDark ? 1 : 0.35,
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#c5d4f0]" fill="currentColor" aria-hidden>
            <path d="M20.2 14.3A8.2 8.2 0 0 1 9.7 3.8 8.5 8.5 0 1 0 20.2 14.3Z" />
          </svg>
        </motion.span>
      </span>

      <span className="sr-only">{isDark ? "Dark" : "Light"}</span>
    </motion.button>
  );
}
