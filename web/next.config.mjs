/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_BASE_PATH=/p/rios-invisiveis serves the app under that sub-path.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  transpilePackages: ["maplibre-gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/mapbox"],
  async headers() {
    return [
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, immutable" }],
      },
    ];
  },
};

export default nextConfig;
