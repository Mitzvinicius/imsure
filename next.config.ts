import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Anexos de apólice/negócio aceitam até 20MB (ver TAMANHO_MAXIMO_ANEXO); padrão do Next é 1MB / 10MB no proxy.
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",
  },
};

export default nextConfig;
