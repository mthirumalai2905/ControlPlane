"use client";

import type { FC } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { MeadowFooter } from "@/components/MeadowFooter";
import {
  ActivitySkeleton,
  ComparePanel,
  ConnectorMosaic,
  PipelineStrip,
  SecretsVault,
  StatusSkeleton,
} from "@/components/landing/BentoVisuals";
import { CircularSteps } from "@/components/landing/CircularSteps";
import { CommandTerminal } from "@/components/landing/CommandTerminal";
import { LogoCloud } from "@/components/landing/LogoCloud";
import {
  FloatingOrb,
  Parallax,
  Reveal,
  RevealText,
  easeOut,
  stagger,
  fadeUp,
} from "@/components/landing/motion";
import { OrbitalArchitecture } from "@/components/landing/OrbitalArchitecture";
import { SceneHero, heroChildVariants } from "@/components/landing/SceneHero";
import { GlassConnectorCard } from "@/components/marketplace/GlassConnectorCard";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CATEGORY_LABELS, PRODUCT_CATALOG } from "@/lib/catalog";
import {
  LogoGitHub,
  LogoPostgres,
  LogoSlack,
  LogoNotion,
  LogoFigma,
  LogoCursor,
} from "@/components/landing/BrandLogos";

const CONNECTOR_ICON: Record<string, FC<{ className?: string }>> = {
  github: LogoGitHub,
  postgres: LogoPostgres,
  slack: LogoSlack,
  notion: LogoNotion,
  figma: LogoFigma,
  puppeteer: LogoCursor,
};

function ArchitectureSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const textY = useTransform(scrollYProgress, [0, 1], [40, -20]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#1a2218] px-6 py-24 text-[#e8efe6] dark:bg-[#060a10]"
    >
      <FloatingOrb className="left-[8%] top-[20%] h-48 w-48 bg-[#2f5d3a]/25" drift={40} />
      <FloatingOrb className="right-[10%] bottom-[15%] h-56 w-56 bg-[#4a6cff]/15" drift={50} />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <motion.div style={reduce ? undefined : { y: textY }}>
          <RevealText className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#7a8a76]">
            System topology
          </RevealText>
          <RevealText
            as="h2"
            delay={0.08}
            className="mt-3 font-heading text-3xl font-medium tracking-calm sm:text-5xl"
          >
            The OS between agents and software
          </RevealText>
          <Reveal delay={0.16}>
            <p className="mt-4 max-w-md text-[#a8b5a4]">
              Agents orbit the core. Enterprise systems plug in. Control Plane sits in the middle —
              discover, auth, monitor, heal.
            </p>
          </Reveal>
        </motion.div>
        <motion.div style={reduce ? undefined : { y: orbY }}>
          <OrbitalArchitecture />
        </motion.div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="landing min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <motion.header
        className="absolute inset-x-0 top-0 z-20"
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeOut, delay: 0.2 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl tracking-tight text-white drop-shadow-sm">
            Control Plane
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2 py-1 backdrop-blur-md lg:flex">
            {[
              ["Product", "capabilities"],
              ["How it works", "how-it-works"],
              ["Connectors", "connectors"],
              ["Trust", "trust"],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full px-3 py-1.5 text-sm text-white/90 hover:bg-white/15"
              >
                {label}
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
              href="/registry"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1a2218] shadow-sm transition hover:bg-white/90 dark:bg-white/90"
            >
              Browse marketplace
            </Link>
          </div>
        </div>
      </motion.header>

      <SceneHero>
        <motion.p variants={heroChildVariants} className="font-display text-5xl text-white sm:text-6xl md:text-7xl">
          Control Plane
        </motion.p>
        <motion.h1
          variants={heroChildVariants}
          className="mt-4 max-w-xl font-heading text-2xl font-medium leading-snug tracking-calm text-white/95 sm:text-3xl"
        >
          The IT department for AI employees.
        </motion.h1>
        <motion.p
          variants={heroChildVariants}
          className="mt-4 max-w-lg text-base leading-relaxed text-white/80"
        >
          <span className="dark:hidden">
            Install, authenticate, validate, monitor, and repair enterprise connectors in minutes.
          </span>
          <span className="hidden dark:inline">
            Night shift for your agents — connectors stay healthy while the city sleeps.
          </span>
        </motion.p>
        <motion.div variants={heroChildVariants} className="mt-8 flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard"
              className="inline-block rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#1a2218] transition hover:bg-[#e8efe6]"
            >
              Open the console
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <a
              href="#capabilities"
              className="inline-block rounded-full border border-white/40 px-5 py-2.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              See capabilities
            </a>
          </motion.div>
        </motion.div>
      </SceneHero>

      <section className="relative border-y border-[var(--line)] bg-[var(--page-bg)] py-14">
        <Reveal>
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--faint)]">
            Trusted by teams building AI at
          </p>
        </Reveal>
        <Parallax speed={0.12}>
          <LogoCloud direction="left" speed="slow" />
        </Parallax>
        <Parallax speed={-0.1} className="mt-2">
          <LogoCloud direction="right" speed="slow" />
        </Parallax>
      </section>

      <section id="capabilities" className="relative overflow-hidden bg-[var(--page-bg-soft)] px-6 py-24">
        <FloatingOrb className="-left-10 top-24 h-64 w-64 bg-[#2f5d3a]/10" drift={35} />
        <FloatingOrb className="right-0 top-1/2 h-72 w-72 bg-[#c5d0bc]/20 dark:bg-[#4a6cff]/10" drift={45} />
        <div className="relative mx-auto mb-14 max-w-6xl">
          <RevealText as="h2" className="font-heading text-3xl font-medium tracking-calm sm:text-5xl">
            Infrastructure that heals itself
          </RevealText>
          <Reveal delay={0.1}>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Discovery through self-healing — so your agents never wait on config files.
            </p>
          </Reveal>
        </div>

        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2"
            title="Live connector fleet"
            description="Status, latency, and repair state across every installed connector — at a glance."
            header={<StatusSkeleton />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                01 · Monitor
              </span>
            }
          />
          <BentoGridItem
            title="AI activity feed"
            description="Every decision logged: found → install → auth → validate."
            header={<ActivitySkeleton />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                02 · Trace
              </span>
            }
          />
          <BentoGridItem
            title="Marketplace"
            description="Tier-1 connectors ready to install — no doc spelunking."
            header={<ConnectorMosaic />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                03 · Discover
              </span>
            }
          />
          <BentoGridItem
            className="md:col-span-2"
            title="Full lifecycle automation"
            description="Discover → install → authenticate → validate → heal. One intent. Done."
            header={<PipelineStrip />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                04 · Automate
              </span>
            }
          />
          <BentoGridItem
            title="Encrypted secrets"
            description="Keys stay vaulted. Injected only at runtime."
            header={<SecretsVault />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                05 · Secure
              </span>
            }
          />
          <BentoGridItem
            className="md:col-span-2"
            title="Hours → minutes"
            description="Stop babysitting OAuth and .env files. Say “Install GitHub” and ship."
            header={<ComparePanel />}
            icon={
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                06 · Accelerate
              </span>
            }
          />
        </BentoGrid>
      </section>

      <section id="how-it-works" className="relative mx-auto max-w-6xl overflow-hidden px-6 py-24">
        <FloatingOrb className="-right-20 top-10 h-64 w-64 bg-[var(--accent)]/10" drift={30} />
        <RevealText as="h2" className="font-heading text-3xl font-medium tracking-calm sm:text-5xl">
          Intent in. Infrastructure out.
        </RevealText>
        <Reveal delay={0.1}>
          <p className="mt-3 max-w-lg text-[var(--muted)]">
            Say “Connect GitHub.” Control Plane handles the rest.
          </p>
        </Reveal>
        <CircularSteps />
      </section>

      <ArchitectureSection />

      <section id="connectors" className="relative overflow-hidden px-6 py-24">
        <FloatingOrb className="left-1/3 top-10 h-80 w-80 bg-[var(--accent)]/8" drift={28} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(47,93,58,0.06),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(74,108,255,0.08),_transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <RevealText className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--faint)]">
                Full catalog · {PRODUCT_CATALOG.length} products
              </RevealText>
              <RevealText
                as="h2"
                delay={0.06}
                className="mt-1 font-heading text-3xl font-medium tracking-calm sm:text-5xl"
              >
                Connector marketplace
              </RevealText>
              <Reveal delay={0.12}>
                <p className="mt-3 max-w-md text-[var(--muted)]">
                  Every Tier 1 and Tier 2 connector Control Plane ships — install from the console or
                  ask in natural language.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              <Link
                href="/registry"
                className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--page-bg)] transition hover:opacity-90"
              >
                Open marketplace →
              </Link>
            </Reveal>
          </div>

          <motion.ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-6%" }}
            variants={stagger}
          >
            {PRODUCT_CATALOG.map((c, i) => (
              <motion.li key={c.slug} className="h-full" variants={fadeUp}>
                <GlassConnectorCard
                  name={c.name}
                  slug={c.slug}
                  description={c.description}
                  classification={c.classification}
                  tier={c.tier}
                  category={CATEGORY_LABELS[c.category]}
                  auth={c.auth}
                  tools={c.tools}
                  tags={c.tags}
                  index={0}
                  disableEnterAnimation
                  icon={
                    CONNECTOR_ICON[c.slug]
                      ? (() => {
                          const Icon = CONNECTOR_ICON[c.slug];
                          return <Icon className="h-5 w-5" />;
                        })()
                      : undefined
                  }
                  primaryAction={{
                    label: "Connect in console",
                    onClick: () => {
                      window.location.href = "/registry";
                    },
                  }}
                />
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--page-bg-soft)] px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-heading text-3xl font-medium tracking-calm sm:text-5xl">
              Talk to Control Plane
            </h2>
            <p className="mt-4 max-w-md text-[var(--muted)]">
              Install, repair, restart, update, and fleet status — no terminal required.
            </p>
            <Link
              href="/activity"
              className="mt-8 inline-flex rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--page-bg)] transition hover:opacity-90"
            >
              Try the activity feed
            </Link>
          </Reveal>
          <Parallax speed={0.18}>
            <CommandTerminal />
          </Parallax>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-6xl px-6 py-24">
        <RevealText as="h2" className="font-heading text-3xl font-medium tracking-calm sm:text-5xl">
          Autonomous — still in control
        </RevealText>
        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          {[
            {
              title: "Confirm risky actions",
              body: "Auto-restart crashes; ask before secrets, deletes, or non-official sources.",
            },
            {
              title: "Audit every step",
              body: "Reasoning, tool, and outcome logged — the feed is the trust layer.",
            },
            {
              title: "Fail loud, recover quiet",
              body: "Blips self-heal. Structural failures surface with one clear next step.",
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={reduce ? undefined : { y: -6, transition: { duration: 0.3 } }}
              className="rounded-2xl border border-[var(--line)] bg-[var(--glass)] p-6 backdrop-blur-xl"
            >
              <div className="mb-4 h-1 w-10 rounded-full bg-[var(--accent)]" />
              <p className="text-lg font-medium">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--line)] px-6 py-24">
        <FloatingOrb className="left-1/2 top-0 h-64 w-64 -translate-x-1/2 bg-[var(--accent)]/10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(47,93,58,0.08),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(74,108,255,0.1),_transparent_55%)]" />
        <Reveal className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-heading text-3xl font-medium tracking-calm sm:text-4xl">
              Ready to stop editing JSON?
            </p>
            <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
              Connect GitHub or Filesystem and watch Control Plane validate and monitor end to end.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/registry"
                className="inline-block rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--page-bg)] transition hover:opacity-90"
              >
                Browse marketplace
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/dashboard"
                className="inline-block rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--page-bg-soft)]"
              >
                Open console
              </Link>
            </motion.div>
          </div>
        </Reveal>
      </section>

      <MeadowFooter />
    </div>
  );
}
