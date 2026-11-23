import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { generateThirdPartyNotices } from './scripts/generate-third-party-notices.mjs';

// Read the effective local API port from .dev-api-port (written by dev-server.js).
function resolveApiPort(envApiPort?: string): number {
  try {
    const filePath = path.resolve(process.cwd(), '.dev-api-port');
    if (existsSync(filePath)) {
      const port = parseInt(readFileSync(filePath, 'utf8').trim(), 10);
      if (Number.isFinite(port) && port > 0) return port;
    }
  } catch { /* fall through to env/default */ }
  return parseInt(envApiPort || '4001', 10);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  const apiPort = resolveApiPort(env.API_PORT);
  const mainSiteBuild = process.env.TENMEI_MAIN_SITE_BUILD === '1';
  const thirdPartyNoticePlugin = {
    name: 'third-party-license-notices',
    apply: 'build' as const,
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
      const projectRoot = process.cwd();
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_NOTICES.txt',
        source: generateThirdPartyNotices(projectRoot),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'UPTIMEWORKER_LICENSE.txt',
        source: readFileSync(path.resolve(projectRoot, 'LICENSE'), 'utf8'),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'UPTIMEWORKER_NOTICE.txt',
        source: readFileSync(path.resolve(projectRoot, 'NOTICE'), 'utf8'),
      });
    },
  };

  return {
    // The same app is published at / on its dedicated Pages project and at
    // /status/ inside the main site. Build each variant with the correct base.
    base: mainSiteBuild ? '/status/' : '/',
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    server: {
      port: parseInt(env.PORT || '4000'),
      host: env.HOST || '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      thirdPartyNoticePlugin,
      !isDev ? {
        name: 'cloudflare-pages-exit-fix',
        closeBundle() {
          if (process.env.CF_PAGES) setTimeout(() => process.exit(0), 1000);
        }
      } : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
      }
    },
    build: {
      outDir: mainSiteBuild ? 'dist-main' : 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000
    }
  };
});
