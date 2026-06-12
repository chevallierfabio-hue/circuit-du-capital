import { defineConfig } from 'vite';

// M0 — Vite vanilla. Pas de transformation exotique : on sert /public tel quel
// (HDRI, GLB DRACO, décodeur DRACO) et on laisse Three.js charger ses addons en ESM.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    target: 'es2022',           // top-level await dans src/main.js
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    open: false,
  },
});
