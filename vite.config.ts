import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';

import { enabledViewerSourcesSchema } from './src/sources/source-options';

const sourceFrameAncestors = {
  beatsaver: ['https://beatsaver.com'],
  scoresaber: ['https://scoresaber.com'],
  beatleader: ['https://beatleader.com', 'https://beatleader.xyz'],
};

export default defineConfig(({ mode }) => {
  const enabledSources = enabledViewerSourcesSchema.parse(loadEnv(mode, process.cwd(), 'VITE_').VITE_ENABLED_SOURCES);
  const securityHeaders = {
    'content-security-policy': `frame-ancestors 'self' ${enabledSources
      .flatMap((source) => sourceFrameAncestors[source])
      .join(' ')}`,
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
  };

  return {
    plugins: [
      tanstackStart({ rsc: { enabled: true } }),
      nitro({
        preset: 'node-server',
        compressPublicAssets: { gzip: true, brotli: true },
        routeRules: {
          '/**': { headers: securityHeaders },
          '/assets/**': {
            headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          },
          '/environments/**': {
            headers: { 'cache-control': 'public, max-age=3600, must-revalidate' },
          },
          '/environments/textures/**': {
            headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          },
          '/fonts/**': {
            headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          },
          '/twemoji/**': {
            headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          },
          '/health': { headers: { 'cache-control': 'no-store' } },
        },
      }),
      rsc(),
      viteReact(),
      tailwindcss(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    ssr: {
      external: ['@resvg/resvg-js'],
    },
    optimizeDeps: {
      exclude: ['@resvg/resvg-js'],
    },
    build: {
      sourcemap: false,
      minify: 'oxc',
      chunkSizeWarningLimit: 1024,
    },
  };
});
