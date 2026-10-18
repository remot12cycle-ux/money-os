import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is per-user and request-time (Supabase session), so the
  // fully dynamic rendering model is the right fit here.
  cacheComponents: false,
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
