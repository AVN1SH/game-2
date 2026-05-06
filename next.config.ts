import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Three.js to be transpiled
  transpilePackages: ["three"],
  // Silence the turbopack/webpack mismatch warning
  turbopack: {},
};

export default nextConfig;
