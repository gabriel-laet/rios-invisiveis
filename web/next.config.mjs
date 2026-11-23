/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_BASE_PATH=/p/rios-invisiveis serves the app under that sub-path.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

// STATIC_EXPORT=1 builds a plain static site (Cloudflare: scripts/build-cloudflare.sh),
// in its own build dir so it never clobbers a running `next dev`.
const staticExport = process.env.STATIC_EXPORT === "1";

async function headers() {
  return [
    {
      source: "/data/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
  ];
}

const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  ...(staticExport ? { output: "export", distDir: ".next-export" } : { headers }),
  transpilePackages: ["maplibre-gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/mapbox"],
};

export default nextConfig;
