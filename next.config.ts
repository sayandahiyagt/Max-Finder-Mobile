import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MAXFINDER_CLOUD_DEVELOPMENT === "1"
    ? process.env.NODE_ENV === "development" ? ".next-cloud-dev" : ".next-cloud"
    : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
