import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rios Invisíveis · São Paulo",
  description:
    "Mapa interativo dos rios escondidos sob São Paulo — canalizados, soterrados, esquecidos. Dados do GeoSampa e do mapeamento SARA Brasil (1930).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">{children}</body>
    </html>
  );
}
