import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mapa Mental Complexo com IA",
  description: "Editor de mapas mentais complexos com inteligência artificial. Controle granular de features, temas, e capacidades de IA.",
  keywords: ["mapa mental", "mind map", "IA", "AI", "Next.js", "TypeScript", "Z.ai"],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Mapa Mental Complexo com IA",
    description: "Editor de mapas mentais com IA e controle granular",
    url: "https://chat.z.ai",
    siteName: "Mapa Mental IA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa Mental Complexo com IA",
    description: "Editor de mapas mentais com IA e controle granular",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
