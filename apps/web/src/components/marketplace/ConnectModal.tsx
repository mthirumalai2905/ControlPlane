"use client";

import type { RegistryEntry } from "@/lib/api";
import { entryMeta } from "@/lib/marketplace";

type Field = { name: string; purpose: string; secret: boolean };

type Props = {
  entry: RegistryEntry;
  secrets: Record<string, string>;
  setSecrets: (next: Record<string, string>) => void;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
};

export function ConnectModal({
  entry,
  secrets,
  setSecrets,
  onClose,
  onConfirm,
  pending,
  error,
}: Props) {
  const meta = entryMeta(entry);
  const fields: Field[] = [
    ...meta.secrets.map((s) => ({ ...s, secret: true })),
    ...meta.configFields.map((s) => ({
      name: s.name,
      purpose: s.purpose || s.name,
      secret: false,
    })),
  ];

  const canSubmit =
    fields.length === 0 || fields.every((f) => (secrets[f.name] || "").trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent-soft)] blur-3xl" />

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">
          Connect connector
        </p>
        <h3 id="connect-title" className="mt-1 font-display text-3xl text-[var(--ink)]">
          {entry.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Control Plane downloads the package, writes config, starts a sandboxed runtime, and logs
          every step in AI Activity.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip chip-accent">{entry.classification}</span>
          <span className="chip">auth · {meta.auth}</span>
          {meta.tools.slice(0, 4).map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>

        {fields.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Configuration
            </p>
            {fields.map((f) => (
              <label key={f.name} className="block text-sm">
                <span className="font-mono text-xs text-[var(--accent)]">{f.name}</span>
                <p className="mb-1 text-xs text-[var(--faint)]">{f.purpose}</p>
                <input
                  type={f.secret ? "password" : "text"}
                  className="console-input"
                  value={secrets[f.name] || ""}
                  onChange={(e) => setSecrets({ ...secrets, [f.name]: e.target.value })}
                  placeholder={f.secret ? "Paste secret (encrypted at rest)" : "Value"}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--page-bg-soft)] px-4 py-3 text-sm text-[var(--muted)]">
            No credentials required. Ready to connect in one click.
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="console-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="console-btn-accent"
            disabled={pending || !canSubmit}
            onClick={onConfirm}
          >
            {pending ? "Connecting…" : "Confirm connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
