import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Static export: the web app is HTML and client code on a CDN, and every
  // server-side concern lives in apps/api.
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Turbopack has to be told the workspace root, the lockfile being two levels
  // above the app.
  turbopack: {
    root: path.join(import.meta.dirname, '..', '..'),
  },
};

export default nextConfig;
