"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COMMANDS = [
  "Install GitHub",
  "Install PostgreSQL",
  "Repair Slack",
  "Restart Browser",
  "Update GitHub",
  "Show unhealthy connectors",
];

export function CommandTerminal({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#2a3428] bg-[#1a2218] shadow-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#2a3428] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#5c6b58]/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#5c6b58]/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#5c6b58]/30" />
        <span className="ml-3 font-mono text-[11px] text-[#7a8a76]">control-plane · activity</span>
      </div>
      <div className="space-y-3 p-5">
        {COMMANDS.map((cmd, i) => (
          <motion.div
            key={cmd}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-3"
          >
            <span className="font-mono text-sm text-[#3a7348]">›</span>
            <span className="rounded-lg border border-[#2f5d3a]/40 bg-[#243028] px-3 py-1.5 font-mono text-sm text-[#e8efe6]">
              {cmd}
            </span>
          </motion.div>
        ))}
        <motion.div
          className="flex items-center gap-3 pt-1"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          <span className="font-mono text-sm text-[#3a7348]">›</span>
          <span className="h-4 w-0.5 bg-[#e8efe6]" />
        </motion.div>
      </div>
    </div>
  );
}
