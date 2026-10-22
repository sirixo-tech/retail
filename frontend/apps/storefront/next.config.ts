import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@selfx/ui", "@selfx/types"],
  assetPrefix: "/store",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
      { source: "/store/_next/:path*", destination: "/_next/:path*" },
      { source: "/store", destination: "/" },
      { source: "/store/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
