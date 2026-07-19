import type { NextConfig } from "next";

// Separate export target: never pull the authenticated root app or its server-only routes into this graph.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // Root `tsc --noEmit` is the required type gate; keeping it separate avoids blocked child processes on this Windows host.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { webpackBuildWorker: false, workerThreads: true, cpus: 1 },
};

export default nextConfig;
