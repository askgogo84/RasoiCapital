/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk'] },
  // Note: /pitch is served by the native React page at app/pitch/page.tsx.
  // The old /pitch -> /pitch.html redirect (and the static pitch.html) were removed.
}
module.exports = nextConfig