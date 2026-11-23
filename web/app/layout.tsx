import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rios Invisíveis · São Paulo",
  description:
    "São Paulo tem cerca de 5 mil quilômetros de rios e córregos; 1.364 km correm enterrados. Um mapa da água que a cidade escondeu — e do rio que passa perto de você.",
};

export const viewport: Viewport = {
  themeColor: "#0E1316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${newsreader.variable} ${plexMono.variable}`}>
      <body className="bg-asfalto font-serif text-garoa">{children}</body>
    </html>
  );
}
