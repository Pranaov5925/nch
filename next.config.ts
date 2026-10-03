import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript errors fail the build — no silent ignoring.
  reactStrictMode: false,
};

export default nextConfig;
