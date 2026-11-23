import type { Config } from "tailwindcss";
import { P } from "./lib/palette";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asfalto: P.asfalto,
        chao: P.chao,
        painel: P.painel,
        breu: P.breu,
        garoa: P.garoa,
        neblina: P.neblina,
        muro: P.muro,
        memoria: P.memoria,
        rio: P.rio,
        canal: P.canal,
        lago: P.lago,
        sodio: { DEFAULT: P.sodio, claro: P.sodioClaro },
        enchente: P.enchente,
        alerta: P.alerta,
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-newsreader)", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
