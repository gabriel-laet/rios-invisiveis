/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
