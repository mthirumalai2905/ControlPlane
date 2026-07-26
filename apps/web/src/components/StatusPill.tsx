export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "healthy"
      ? "bg-signal-ok/15 text-signal-ok"
      : status === "degraded"
        ? "bg-signal-warn/15 text-signal-warn"
        : ["failed", "unhealthy"].includes(status)
          ? "bg-signal-bad/15 text-signal-bad"
          : "bg-signal-info/15 text-signal-info";

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
