import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.70.251.248", "*.local"],
};

export default nextConfig;
