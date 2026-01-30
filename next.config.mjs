/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: 'dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
