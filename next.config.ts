import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Em produção (Railway), o collab-service roda numa URL separada.
  // Em desenvolvimento local, o gateway Caddy cuida do proxy.
  // (allowedDevOrigins removido — não necessário em produção)
};

export default nextConfig;
