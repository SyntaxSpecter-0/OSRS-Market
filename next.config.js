/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows the same build to be loaded inside the Electron shell via file:// or a local server
  output: 'standalone',
};

module.exports = nextConfig;
