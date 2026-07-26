"use client";

import { motion } from "framer-motion";
import {
  LogoCursor,
  LogoGitHub,
  LogoPostgres,
  LogoSlack,
  LogoVercel,
} from "./BrandLogos";

const ORBIT = [
  { Logo: LogoGitHub, label: "GitHub", angle: 0 },
  { Logo: LogoSlack, label: "Slack", angle: 72 },
  { Logo: LogoPostgres, label: "Postgres", angle: 144 },
  { Logo: LogoCursor, label: "Cursor", angle: 216 },
  { Logo: LogoVercel, label: "Agents", angle: 288 },
];

export function OrbitalArchitecture() {
  return (
    <div className="relative mx-auto flex h-[420px] w-full max-w-xl items-center justify-center sm:h-[480px]">
      {/* soft glow */}
      <div className="pointer-events-none absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,93,58,0.35),transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(74,108,255,0.25),transparent_70%)]" />

      {/* rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-[#3a7348]/25 dark:border-white/10"
          style={{
            width: `${ring * 28 + 40}%`,
            height: `${ring * 28 + 40}%`,
          }}
          animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: 40 + ring * 18,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#5a9a68]" />
        </motion.div>
      ))}

      {/* orbiting logos */}
      <motion.div
        className="absolute h-[78%] w-[78%]"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        {ORBIT.map(({ Logo, label, angle }) => (
          <div
            key={label}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `rotate(${angle}deg) translateY(-46%) rotate(-${angle}deg)`,
            }}
          >
            <motion.div
              className="flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/20 bg-[#1a2218]/90 text-[#e8efe6] shadow-lg backdrop-blur-md dark:bg-[#121820]/95"
              animate={{ rotate: -360 }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              title={label}
            >
              <Logo className="h-5 w-5" />
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* core */}
      <motion.div
        className="relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full border border-[#3a7348]/60 bg-gradient-to-b from-[#243028] to-[#121812] text-center shadow-[0_0_60px_rgba(47,93,58,0.35)]"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#7a8a76]">
          Core
        </span>
        <span className="mt-1 font-display text-lg leading-tight text-white">
          Control
          <br />
          Plane
        </span>
      </motion.div>
    </div>
  );
}
