import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/client-onnx/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', '*.onnx'],
      manifest: {
        name: 'AI Object Detection Demo',
        short_name: 'AI-YOLO',
        description: 'ONNX Runtime Web を使用したリアルタイム物体検出デモ',
        theme_color: '#0a0a0a',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,onnx,wasm,mjs}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
    }),
  ],
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      '@my-app/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    // onnxruntime-web を pre-bundling から除外し、内部の動的 import() が
    // node_modules 内の .mjs / .wasm を直接解決できるようにする
    exclude: ['onnxruntime-web', 'onnxruntime-web/webgpu'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
