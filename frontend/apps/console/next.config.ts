import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@selfx/ui", "@selfx/types"],
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/store", destination: "http://127.0.0.1:3003/store" },
        { source: "/store/:path*", destination: "http://127.0.0.1:3003/store/:path*" },
        { source: "/track", destination: "http://127.0.0.1:3003/track" },
        { source: "/track/:path*", destination: "http://127.0.0.1:3003/track/:path*" },
      ],
      afterFiles: [
        { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
        { source: "/media/:path*", destination: "http://127.0.0.1:8000/media/:path*" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
