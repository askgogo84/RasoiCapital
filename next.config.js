/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk'] },
  // Note: /pitch is now served by app/pitch/page.tsx (which embeds /pitch.html).
  // The old /pitch -> /pitch.html redirect was removed so the in-app page resolves.
}
module.exports = nextConfig