/** Brand marks as inline SVGs - clean geometric marks for logo cloud & cards */

import type React from "react";

type IconProps = { className?: string; title?: string };

export function LogoGitHub({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function LogoSlack({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 15a2 2 0 1 1-2-2h2v2Zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5Zm2-7a2 2 0 1 1 2-2v2H9Zm0 1a2 2 0 1 1 0 4H4a2 2 0 1 1 0-4h5Zm7 2a2 2 0 1 1 2 2h-2v-2Zm-1 0a2 2 0 1 1-4 0V6a2 2 0 1 1 4 0v5Zm-2 7a2 2 0 1 1-2 2v-2h2Zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5Z" />
    </svg>
  );
}

export function LogoVercel({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 3 22 20H2L12 3Z" />
    </svg>
  );
}

export function LogoLinear({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3.5 15.4A9.5 9.5 0 0 0 15.4 3.5L3.5 15.4Zm2.8 2.8L18.2 6.3A9.5 9.5 0 0 1 6.3 18.2Zm2.1 1.7A9.5 9.5 0 0 0 20 8.4L8.4 20Z" />
    </svg>
  );
}

export function LogoNotion({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4.5 4.2 15.8 2.7c.4-.05.7.05.95.3l2.75 3.1c.2.25.3.5.3.85v12.4c0 .55-.35.95-.9 1.05L7.1 21.8c-.35.05-.7-.05-.95-.35L4.1 18.2c-.2-.25-.3-.55-.3-.9V5.15c0-.5.35-.9.7-.95ZM8 7.4v10.5l8.8-1.15V7.85L8 7.4Zm1.7 1.55 5.4.4v1.35l-1.55.15v5.35l-1.55.2V10.9l-2.3-.2V8.95Z" />
    </svg>
  );
}

export function LogoStripe({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.875.69-1.476 1.918-1.476 1.814 0 3.71.767 5.004 1.399l.737-4.505C16.776 1.387 14.683.75 12.15.75 7.728.75 4.75 3.215 4.75 7.05c0 3.55 2.728 5.1 5.99 6.25 2.46.85 3.29 1.45 3.29 2.45 0 .99-.84 1.56-2.25 1.56-1.83 0-3.95-.84-5.56-1.72l-.78 4.63c1.73.9 4.08 1.54 6.5 1.54 4.65 0 7.68-2.3 7.68-6.2 0-3.59-2.72-5.15-5.89-6.22Z" />
    </svg>
  );
}

export function LogoFigma({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 24a4 4 0 0 0 4-4v-4H8a4 4 0 0 0 0 8Zm0-10h4V6H8a4 4 0 1 0 0 8Zm0-8h4V2H8a4 4 0 0 0 0 4Zm6 0h4a4 4 0 1 0 0-4h-4v4Zm4 8a4 4 0 1 0 0-8h-4v4a4 4 0 0 0 4 4Z" />
    </svg>
  );
}

export function LogoCloudflare({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 10.2c.2-.7.1-1.4-.3-2-.5-.7-1.3-1.1-2.2-1.1-.2 0-.5 0-.7.1A3.7 3.7 0 0 0 9.5 5c-1.9 0-3.5 1.4-3.7 3.3C4.3 8.5 3 9.9 3 11.7c0 .2 0 .3.01.5H16.7c.1-.6.1-1.3-.2-2Zm4.4 2.4h-.2c-.2-.9-.8-1.6-1.6-2l-.3 1.1c.4.2.6.6.6 1.1 0 .7-.5 1.2-1.2 1.2H7.1c-.2 0-.3.2-.3.4 0 .1.1.3.2.3l.2.1h12.8c.9 0 1.7-.7 1.9-1.6v-.6Z" />
    </svg>
  );
}

export function LogoDatadog({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.2 6.8 3.8L12 12 5.2 8 12 4.2ZM5 9.7l6 3.4v6.7l-6-3.4V9.7Zm8 10.1v-6.7l6-3.4v6.7l-6 3.4Z" />
    </svg>
  );
}

export function LogoShopify({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.7 4.3c-.1 0-.3 0-.5.1l-.3-1c-.1-.3-.3-.4-.5-.4h-.1c-.4 0-.7.2-.9.6l-.3 1c-1 .3-1.7.5-1.8.5-.2 0-2.8 1-3.7 7.8 0 0-2.2-.9-2.4-.8-.2.1-1.9 12.5-1.9 12.5l12.4 2.4 3.4-13.8c.1-.4-.5-1-.9-1.1-.4-.1-1.8-.5-2.5-.8Zm-3.2.5.6 2.1c-.5.1-1.1.3-1.7.4l-.5-2c.5-.2 1.1-.4 1.6-.5Zm-2.4.8.5 1.9c-.5.2-1 .3-1.4.5l-.6-1.8c.5-.2 1-.4 1.5-.6Z" />
    </svg>
  );
}

export function LogoCursor({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 3.5 19.5 12 11 13.5 8.5 21 4 3.5Z" />
    </svg>
  );
}

export function LogoAnthropic({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.8 4h-3.6L4 20h3.2l1.4-3.6h6.8L16.8 20H20L13.8 4Zm-3.4 9.6 2.6-6.8 2.6 6.8h-5.2Z" />
    </svg>
  );
}

export function LogoPostgres({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.4 2c-2.2 0-4 .6-5.1 1.5C6 4.3 5.4 5.5 5.4 7v.4C3.8 8 3 9.2 3 10.7c0 1.2.5 2.2 1.4 2.9-.2.5-.3 1-.3 1.6 0 2.2 1.8 3.5 4.2 3.8.5 1.2 1.5 2.2 3.2 2.8l.5-1.4c-1.2-.4-1.9-1.1-2.2-1.9 1 .2 2.1.3 3.2.3 1.3 0 2.5-.2 3.6-.5-.1.5-.4 1-1 1.4l.7 1.3c1.2-.7 1.9-1.7 2.2-2.9 2-.4 3.5-1.7 3.5-3.7 0-.5-.1-1-.3-1.4.8-.7 1.3-1.7 1.3-2.8 0-1.6-.9-2.8-2.5-3.5.1-.3.1-.6.1-.9 0-1.5-.6-2.7-1.8-3.6C16.4 2.5 14.6 2 12.4 2Z" />
    </svg>
  );
}

export function LogoRamp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5 5h8.5a5.5 5.5 0 0 1 0 11H9.5V19H5V5Zm4.5 7h4a2.5 2.5 0 0 0 0-5H9.5v5Z" />
    </svg>
  );
}

export function LogoRetool({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export const TRUST_BRANDS: {
  name: string;
  Logo: (p: IconProps) => React.ReactElement;
}[] = [
  { name: "Anthropic", Logo: LogoAnthropic },
  { name: "Cursor", Logo: LogoCursor },
  { name: "Vercel", Logo: LogoVercel },
  { name: "Linear", Logo: LogoLinear },
  { name: "Notion", Logo: LogoNotion },
  { name: "Stripe", Logo: LogoStripe },
  { name: "Datadog", Logo: LogoDatadog },
  { name: "Cloudflare", Logo: LogoCloudflare },
  { name: "Shopify", Logo: LogoShopify },
  { name: "Ramp", Logo: LogoRamp },
  { name: "Figma", Logo: LogoFigma },
  { name: "Retool", Logo: LogoRetool },
];

export const CONNECTOR_LOGOS: Record<string, (p: IconProps) => React.ReactElement> = {
  github: LogoGitHub,
  slack: LogoSlack,
  postgres: LogoPostgres,
  notion: LogoNotion,
  figma: LogoFigma,
};
