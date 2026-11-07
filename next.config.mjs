/** Set when hosting under a sub-path, e.g. NEXT_PUBLIC_BASE_PATH=/maya-rosenberg-portfolio for GitHub Pages. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static site (GitHub Pages). Images live in public/remote (see `npm run images`).
  output: 'export',
  trailingSlash: true,
  basePath,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: { unoptimized: true }
}

export default nextConfig
