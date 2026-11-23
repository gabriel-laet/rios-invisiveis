// "Concreto e água, à noite" — tokens from docs/STORY_DESIGN.md §1.1.
// Blue = water you can see. Amber = water you can't.
export const P = {
  asfalto: "#0E1316", // page + map background
  chao: "#141B1F", // land inside the municipality
  painel: "#11181C", // story/explore panels (at 90 %)
  breu: "#07090B", // mask outside the city
  garoa: "#ECE8E1", // primary text, city outline
  neblina: "#A3ADB2", // secondary text
  muro: "#6E7A80", // canal casing, dividers — never body text
  memoria: "#3B4A52", // rivers of unknown state in past-tense beats
  rio: "#4FB8E6", // natural / open river
  canal: "#8FB3C4", // open concrete channel
  lago: "#2F7FB0", // lakes / reservoirs
  sodio: "#F5A524", // buried rivers, year accent, CTA
  sodioClaro: "#FFC766", // buried core line, focus, kicker
  enchente: "#3A6BD1", // 100-yr flood fill
  alerta: "#FF6B5A", // errors in "Rio perto de mim"
} as const;
