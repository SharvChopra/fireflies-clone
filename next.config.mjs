/** @type {import('next').NextConfig} */
const configuredApiTarget =
  process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";
const apiTarget = /^https?:\/\//i.test(configuredApiTarget)
  ? configuredApiTarget
  : `${process.env.API_PROXY_PROTOCOL ?? "https"}://${configuredApiTarget}`;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
