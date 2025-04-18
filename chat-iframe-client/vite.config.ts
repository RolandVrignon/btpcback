import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Déterminer si nous sommes dans un environnement Docker
const isDocker = process.env.DOCKER_ENV === 'true';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: isDocker ? '/app/public/chat' : '../public/chat',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom', 'ai'],
          markdown: [
            'react-markdown',
            'remark-gfm',
            'remark-math',
            'rehype-highlight',
            'highlight.js',
          ],
          ui: ['@radix-ui/react-scroll-area', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: '/chat/',
});
