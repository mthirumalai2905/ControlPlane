export default function Placeholder({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-mist-400 max-w-xl">{blurb}</p>
      <p className="text-xs font-mono text-mist-400 panel inline-block rounded-md px-3 py-2">
        Shell ready · wired in later phase
      </p>
    </div>
  );
}
