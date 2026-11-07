/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = 'maya-rosenberg-portfolio';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (isGithubActions ? `/${repoName}` : '');

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { 
    unoptimized: true 
  }
};

export default nextConfig;