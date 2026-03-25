import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "steamcdn-a.akamaihd.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.akamaihd.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
