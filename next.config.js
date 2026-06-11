/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk'] },
  async redirects() {
    return [
      { source: '/pitch', destination: '/pitch.html', permanent: false }
    ]
  }
}
module.exports = nextConfig