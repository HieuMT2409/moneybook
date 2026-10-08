import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone', // small self-contained server for the Docker image
  outputFileTracingRoot: path.join(__dirname, '../../'), // monorepo: trace deps from the repo root
  eslint: { ignoreDuringBuilds: true }, // lint runs as its own step (npm run lint)
  async headers() {
    return [
      // The browser must always re-check the service worker script so updates reach users.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },
};

export default nextConfig;
