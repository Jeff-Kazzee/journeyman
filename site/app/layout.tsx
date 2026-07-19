import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Journeyman — The AI that won’t do your homework", template: "%s · Journeyman" },
  description: "A local-first apprenticeship agent that makes learners show their work and produces inspectable evidence.",
  icons: { icon: "/brand/journeyman-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
