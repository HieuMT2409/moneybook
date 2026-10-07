import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone', // small self-contained server for the Docker image
  outputFileTracingRoot: path.join(__dirname, '../../'), // monorepo: trace deps from the repo root
  eslint: { ignoreDuringBuilds: true }, // lint runs as its own step (npm run lint)
};

export default nextConfig;
