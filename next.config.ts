import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { source: '/fornecedor', destination: '/supplier', permanent: true },
      { source: '/gestor', destination: '/manager', permanent: true },
      { source: '/financeiro', destination: '/financial', permanent: true },
    ]
  },
  // ⚠️ Configuração para build simples e rápido
  eslint: {
    ignoreDuringBuilds: true, // Ignora ESLint no build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignora erros de TypeScript no build
  },
  images: {
    remotePatterns: [],
    unoptimized: true, // Desabilitar otimização para arquivos locais
  },
};

export default nextConfig;
