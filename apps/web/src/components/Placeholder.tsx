export default function Placeholder({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-[#1a2218]">{title}</h1>
      <p className="max-w-xl text-[#5c6b58]">{blurb}</p>
      <p className="panel inline-block rounded-md px-3 py-2 font-mono text-xs text-[#8a9a84]">
        Coming soon · Control Plane meadow theme
      </p>
    </div>
  );
}
