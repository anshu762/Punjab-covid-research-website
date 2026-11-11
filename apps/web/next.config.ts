import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@epilens/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
