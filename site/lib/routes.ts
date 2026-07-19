export const canonicalTranscriptSlug = "demo";

export const internalPages = [
  { key: "home", label: "Home", href: "/" },
  { key: "demo", label: "Demo dashboard", href: "/demo/" },
  { key: "transcript", label: "Transcript", href: `/t/${canonicalTranscriptSlug}/` },
  { key: "whitepaper", label: "White paper", href: "/whitepaper/" },
] as const;

export type PageKey = (typeof internalPages)[number]["key"];
