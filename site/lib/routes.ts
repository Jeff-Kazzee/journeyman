export const canonicalTranscriptSlug = "demo";

// GitHub Pages serves project sites under a sub-path. Set
// NEXT_PUBLIC_SITE_BASE_PATH (e.g. "/journeyman") at build time; empty for
// root-hosted builds and local serving. next.config.ts consumes the same var.
export const siteBase = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";
export const withBase = (path: string): string => `${siteBase}${path}`;

export const internalPages = [
  { key: "home", label: "Home", href: withBase("/") },
  { key: "demo", label: "Demo dashboard", href: withBase("/demo/") },
  { key: "transcript", label: "Transcript", href: withBase(`/t/${canonicalTranscriptSlug}/`) },
  { key: "whitepaper", label: "White paper", href: withBase("/whitepaper/") },
] as const;

export type PageKey = (typeof internalPages)[number]["key"];
