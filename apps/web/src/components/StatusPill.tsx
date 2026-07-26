export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "healthy"
      ? "bg-[#2f5d3a]/12 text-[#2f5d3a]"
      : status === "degraded" || status === "pending" || status === "waiting_user"
        ? "bg-[#c4893a]/15 text-[#8a5a18]"
        : ["failed", "unhealthy"].includes(status)
          ? "bg-[#b85c5c]/15 text-[#8b3a3a]"
          : "bg-[#5c6b58]/12 text-[#5c6b58]";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}
