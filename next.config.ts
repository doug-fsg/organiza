import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // ⚠️ Configuração para build simples e rápido
  eslint: {
    ignoreDuringBuilds: true, // Ignora ESLint no build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignora erros de TypeScript no build
  },
};

export default nextConfig;
