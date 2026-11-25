import { defineConfig } from 'vite';

// base relativa: funciona igual en localhost y en GitHub Pages (usuario.github.io/repo/)
export default defineConfig({
  base: './',
  server: { port: 5232, host: true },
  build: { chunkSizeWarningLimit: 1200 },
});
