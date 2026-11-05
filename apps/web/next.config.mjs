/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@puskica/shared"],
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  poweredByHeader: false,
  images: { unoptimized: true },
  async rewrites() {
    // в dev без nginx — проксируем /api на FastAPI
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: `${process.env.API_INTERNAL || "http://localhost:8710"}/api/:path*` }]
      : [];
  },
};
export default nextConfig;
