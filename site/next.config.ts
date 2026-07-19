import type { NextConfig } from "next";

// Separate export target: never pull the authenticated root app or its server-only routes into this graph.
// NEXT_PUBLIC_SITE_BASE_PATH ("/journeyman" on GitHub Pages, empty at root) is shared with lib/routes.ts.
const basePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // Root `tsc --noEmit` is the required type gate; keeping it separate avoids blocked child processes on this Windows host.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { webpackBuildWorker: false, workerThreads: true, cpus: 1 },
};

export default nextConfig;
