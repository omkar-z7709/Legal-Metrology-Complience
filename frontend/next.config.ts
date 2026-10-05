import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
  experimental: {
    // Every route here is a "use client" page that fetches its own data from the
    // backend, so the RSC payload carries zero server data. Next 15 defaults
    // this to 0, which invalidates the client router cache immediately and
    // forces a fresh RSC round-trip on every sidebar navigation — a server
    // request that navigation does not need. 60s matches the app's own
    // fetchWithCache TTL.
    staleTimes: { dynamic: 60, static: 180 },
  },
};

export default nextConfig;
