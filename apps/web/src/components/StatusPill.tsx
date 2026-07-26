export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "healthy"
      ? "bg-[var(--ok-soft)] text-[var(--ok)]"
      : status === "degraded" || status === "pending" || status === "waiting_user"
        ? "bg-[var(--warn-soft)] text-[var(--warn)]"
        : ["failed", "unhealthy"].includes(status)
          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
          : "bg-[var(--page-bg-soft)] text-[var(--muted)]";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}
