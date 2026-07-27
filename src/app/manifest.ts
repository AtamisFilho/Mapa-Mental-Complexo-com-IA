import type { MetadataRoute } from "next";

/**
 * Web App Manifest — Next.js App Router convention.
 * Gerado automaticamente em /manifest.webmanifest.
 *
 * Permite que o app seja instalado como PWA (Progressive Web App)
 * no Android (Chrome), iOS (Safari) e Desktop (Chrome/Edge).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mapa Mental Complexo com IA",
    short_name: "Mapa Mental IA",
    description:
      "Editor de mapas mentais complexos com inteligência artificial. Controle granular de features, temas, e capacidades de IA.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#10b981",
    categories: ["productivity", "education", "business"],
    lang: "pt-BR",
    dir: "ltr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Novo mapa mental",
        short_name: "Novo",
        description: "Criar um novo mapa mental em branco",
        url: "/?action=new",
      },
      {
        name: "Gerar com IA",
        short_name: "Gerar IA",
        description: "Gerar um mapa mental completo a partir de um tema",
        url: "/?action=generate",
      },
    ],
  };
}
