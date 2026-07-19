import type { Metadata } from "next";
import type { ReactNode } from "react";
import { withBase } from "../lib/routes";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Journeyman: The AI that won’t do your homework", template: "%s · Journeyman" },
  description: "Meet Hoolio, the AI mentor who won’t do your homework. He reads real job ads, finds what you’re missing, and hands you real work to close the gap. Runs on your machine.",
  icons: { icon: withBase("/brand/journeyman-mark.svg") },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
