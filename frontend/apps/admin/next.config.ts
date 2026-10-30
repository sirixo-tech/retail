import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@selfx/ui", "@selfx/types"],
  basePath: "/superadmin",
  async redirects() {
    return [
      { source: "/", destination: "/superadmin", permanent: false, basePath: false },
      { source: "/login", destination: "/superadmin/login", permanent: false, basePath: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
          basePath: false,
        },
        {
          source: "/media/:path*",
          destination: "http://127.0.0.1:8000/media/:path*",
          basePath: false,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
