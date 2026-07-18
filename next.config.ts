import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The root build script runs `tsc --noEmit` explicitly. Keeping webpack in
  // process avoids extra child processes on constrained Windows hosts.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { webpackBuildWorker: false, workerThreads: true },
  outputFileTracingIncludes: {
    "/demo": ["./data/demo-snapshot.json"],
    "/t/[slug]": ["./data/demo-snapshot.json"],
  },
};

export default nextConfig;