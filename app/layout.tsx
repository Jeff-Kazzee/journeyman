import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Journeyman — The AI that won't do your homework.",
  description: "An apprenticeship agent for adults changing careers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}