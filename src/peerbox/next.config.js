/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/peerbox",
  assetPrefix: "/peerbox/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
