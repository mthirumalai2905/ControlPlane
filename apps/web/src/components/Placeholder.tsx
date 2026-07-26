export default function Placeholder({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-[var(--ink)]">{title}</h1>
      <p className="max-w-xl text-[var(--muted)]">{blurb}</p>
      <p className="panel inline-block rounded-md px-3 py-2 font-mono text-xs text-[var(--faint)]">
        Coming soon · Control Plane
      </p>
    </div>
  );
}
