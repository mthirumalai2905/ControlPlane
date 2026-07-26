"use client";

import { motion } from "framer-motion";

const LAYERS = [
  {
    label: "AI agents",
    items: ["Claude", "Cursor", "LangGraph", "CrewAI"],
    tone: "light" as const,
  },
  {
    label: "Control Plane",
    items: ["Discover", "Auth", "Monitor", "Heal"],
    tone: "accent" as const,
  },
  {
    label: "Enterprise systems",
    items: ["GitHub", "Slack", "Postgres", "APIs"],
    tone: "light" as const,
  },
];

export function ArchitectureStack() {
  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#3a7348] to-transparent" />
      <div className="space-y-6">
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className={
              layer.tone === "accent"
                ? "relative z-10 rounded-2xl border border-[#3a7348]/50 bg-[#243028] p-6 shadow-[0_0_40px_rgba(47,93,58,0.25)]"
                : "relative z-10 rounded-2xl border border-[#2a3428] bg-[#121812]/80 p-6 backdrop-blur-sm"
            }
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8a76]">
              {layer.label}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {layer.items.map((item) => (
                <span
                  key={item}
                  className={
                    layer.tone === "accent"
                      ? "rounded-full bg-[#2f5d3a] px-3 py-1 text-sm text-[#e8efe6]"
                      : "rounded-full border border-[#3a4a38] px-3 py-1 text-sm text-[#c5d0bc]"
                  }
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
