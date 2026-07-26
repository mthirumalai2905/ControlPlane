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
        className="absolute inset-0 bg-[#1a2218]/45 backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(26,34,24,0.2)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#2f5d3a]/15 blur-3xl" />

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a9a84]">
          Connect connector
        </p>
        <h3 id="connect-title" className="mt-1 font-display text-3xl text-[#1a2218]">
          {entry.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#5c6b58]">
          Control Plane downloads the package, writes config, starts a sandboxed runtime, and logs
          every step in AI Activity.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#e9eee6] px-2.5 py-1 font-mono text-[10px] uppercase text-[#2f5d3a]">
            {entry.classification}
          </span>
          <span className="rounded-full bg-[#e9eee6] px-2.5 py-1 font-mono text-[10px] uppercase text-[#5c6b58]">
            auth · {meta.auth}
          </span>
          {meta.tools.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-[#1a2218]/5 px-2.5 py-1 font-mono text-[10px] text-[#5c6b58]"
            >
              {t}
            </span>
          ))}
        </div>

        {fields.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a9a84]">
              Configuration
            </p>
            {fields.map((f) => (
              <label key={f.name} className="block text-sm">
                <span className="font-mono text-xs text-[#2f5d3a]">{f.name}</span>
                <p className="mb-1 text-xs text-[#8a9a84]">{f.purpose}</p>
                <input
                  type={f.secret ? "password" : "text"}
                  className="console-input bg-white/80"
                  value={secrets[f.name] || ""}
                  onChange={(e) => setSecrets({ ...secrets, [f.name]: e.target.value })}
                  placeholder={f.secret ? "Paste secret (encrypted at rest)" : "Value"}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[#d5ddd0]/80 bg-[#e9eee6]/60 px-4 py-3 text-sm text-[#5c6b58]">
            No credentials required — ready to connect in one click.
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[#8b3a3a]">{error}</p>}

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
