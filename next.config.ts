import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.js",
    },
  },
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    return config;
  },
};

export default nextConfig;
