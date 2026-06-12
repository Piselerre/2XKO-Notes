import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import sirv from 'sirv';
import { viteStaticCopy } from 'vite-plugin-static-copy';

function serveRootAssets(): Plugin {
  const imgDir = path.resolve(__dirname, '../../img');
  return {
    name: 'serve-root-img',
    configureServer(server) {
      server.middlewares.use('/img', sirv(imgDir, { dev: true, maxAge: 86400000 }));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/img', sirv(imgDir));
    },
  };
}

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    serveRootAssets(),
    viteStaticCopy({
      targets: [{ src: '../../img/**/*', dest: 'img' }],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    fs: {
      allow: ['../..'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
