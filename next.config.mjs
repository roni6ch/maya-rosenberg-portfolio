/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: isGithubActions ? '/maya-rosenberg-portfolio' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;