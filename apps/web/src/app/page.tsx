"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const STEPS = [
  { label: "Discover", detail: "Registry + docs" },
  { label: "Install", detail: "Sandboxed" },
  { label: "Authenticate", detail: "One consent" },
  { label: "Validate", detail: "MCP handshake" },
  { label: "Monitor", detail: "Heal quietly" },
];

const HUB = ["GitHub", "Postgres", "Slack", "Filesystem", "Custom"];

export default function LandingPage() {
  return (
    <div className="landing min-h-screen bg-[#f4f6f2] text-[#1a2218]">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl tracking-tight text-white drop-shadow-sm">
            Hermes
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2 py-1 backdrop-blur-md md:flex">
            {["How it works", "Trust", "Registry"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full px-3 py-1.5 text-sm text-white/90 hover:bg-white/15"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm text-white/85 hover:text-white sm:inline"
            >
              Open console
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1a2218] shadow-sm transition hover:bg-white/90"
            >
              Connect an MCP
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — one composition, brand-first, full-bleed visual */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="/hermes-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1a14]/78 via-[#0f1a14]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f4f6f2] via-transparent to-[#0f1a14]/25" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-28 pt-28 md:justify-center md:pb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-5xl tracking-tight text-white sm:text-6xl md:text-7xl"
          >
            Hermes
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mt-4 max-w-xl text-2xl font-medium leading-snug text-white/95 sm:text-3xl"
          >
            Connect MCP. Never touch a config file.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-4 max-w-md text-base leading-relaxed text-white/80"
          >
            The autonomous control plane that discovers, installs, authenticates, validates,
            monitors, and heals Model Context Protocol servers.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#1a2218] transition hover:bg-[#e8efe6]"
            >
              Open the console
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-white/40 px-5 py-2.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        {/* Pixel-soft edge into white */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[#f4f6f2]"
          style={{
            clipPath:
              "polygon(0 40%, 3% 70%, 6% 35%, 9% 80%, 12% 45%, 15% 90%, 18% 50%, 21% 75%, 24% 40%, 27% 85%, 30% 55%, 33% 70%, 36% 35%, 39% 90%, 42% 45%, 45% 80%, 48% 50%, 51% 95%, 54% 40%, 57% 75%, 60% 55%, 63% 85%, 66% 35%, 69% 70%, 72% 50%, 75% 90%, 78% 40%, 81% 80%, 84% 55%, 87% 75%, 90% 45%, 93% 85%, 96% 50%, 100% 70%, 100% 100%, 0 100%)",
          }}
        />
      </section>

      {/* Social proof strip */}
      <section className="border-b border-[#d5ddd0] bg-[#f4f6f2] px-6 py-10">
        <p className="mx-auto max-w-6xl text-center text-sm text-[#5c6b58]">
          Built for teams running Claude, Cursor, and MCP at scale — without babysitting JSON.
        </p>
      </section>

      {/* How it works — activity trail (not hero overlays) */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl tracking-tight sm:text-4xl"
        >
          Intent in. Infrastructure out.
        </motion.h2>
        <p className="mt-3 max-w-xl text-[#5c6b58]">
          You say “connect GitHub MCP.” Hermes discovers docs, installs in a sandbox, handles
          auth, validates the protocol, and keeps watching.
        </p>
        <ol className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex min-w-[9.5rem] flex-1 items-start gap-3 border-l-2 border-[#2f5d3a] pl-4"
            >
              <span className="font-mono text-xs text-[#2f5d3a]">0{i + 1}</span>
              <div>
                <p className="font-medium">{step.label}</p>
                <p className="text-sm text-[#5c6b58]">{step.detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Orchestration hub */}
      <section id="registry" className="bg-[#e9eee6] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-4xl">
            Hermes sits at the center of your MCP fleet
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[#5c6b58]">
            One control plane for every server — official, community, or your own.
          </p>
          <div className="relative mx-auto mt-16 flex h-72 max-w-lg items-center justify-center">
            <div className="absolute h-40 w-40 rounded-full border border-dashed border-[#2f5d3a]/35" />
            <div className="absolute h-56 w-56 rounded-full border border-dashed border-[#2f5d3a]/20" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-[#1a2218] font-display text-lg text-[#e8efe6]"
            >
              Hermes
            </motion.div>
            {HUB.map((name, i) => {
              const angle = (i / HUB.length) * Math.PI * 2 - Math.PI / 2;
              const r = 118;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              return (
                <motion.span
                  key={name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="absolute rounded-full border border-[#c5d0bc] bg-[#f4f6f2] px-3 py-1.5 text-xs font-medium shadow-sm"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                >
                  {name}
                </motion.span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
          Autonomous — with you still in control
        </h2>
        <p className="mt-3 max-w-xl text-[#5c6b58]">
          Progressive trust levels, an append-only AI activity feed, and sandboxed execution.
          Nothing ambient. Every action attributable.
        </p>
        <ul className="mt-12 grid gap-10 sm:grid-cols-3">
          {[
            {
              title: "Confirm risky actions",
              body: "Auto-restart crashes; ask before secrets, deletes, or non-official sources.",
            },
            {
              title: "Audit every step",
              body: "Reasoning, tool, and outcome logged — the feed is the product’s trust layer.",
            },
            {
              title: "Fail loud, recover quiet",
              body: "Transient blips self-heal. Structural failures surface with one clear next step.",
            },
          ].map((item, i) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <p className="font-medium text-lg">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#5c6b58]">{item.body}</p>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="border-t border-[#d5ddd0] bg-[#1a2218] px-6 py-16 text-[#e8efe6]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-3xl tracking-tight">Ready to stop editing JSON?</p>
            <p className="mt-2 text-sm text-[#a8b5a4]">
              Phase 0 console is live — install the filesystem MCP walking skeleton.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full bg-[#e8efe6] px-5 py-2.5 text-sm font-medium text-[#1a2218] transition hover:bg-white"
          >
            Open the console
          </Link>
        </div>
      </section>

      <footer className="bg-[#1a2218] px-6 pb-10 text-xs text-[#7a8a76]">
        <div className="mx-auto flex max-w-6xl justify-between border-t border-white/10 pt-6">
          <span className="font-display text-sm text-[#c5d0bc]">Hermes</span>
          <span>Vercel for MCP · Control Plane</span>
        </div>
      </footer>
    </div>
  );
}
