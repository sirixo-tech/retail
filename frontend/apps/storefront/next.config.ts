import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@selfx/ui", "@selfx/types"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
  },
};

export default nextConfig;
