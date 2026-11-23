// The app can live under a sub-path (e.g. gabriel-laet.com/p/rios-invisiveis):
// set NEXT_PUBLIC_BASE_PATH=/p/rios-invisiveis at build time. Next prefixes its
// own routes and assets; files we fetch by hand go through dataUrl().
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** URL of a file in public/data. Absolute in the browser, so MapLibre's workers resolve it too. */
export function dataUrl(file: string): string {
  const path = `${BASE_PATH}/data/${file}`;
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
}
