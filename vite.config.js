import { defineConfig } from 'vite';

// M0 — Vite vanilla. Pas de transformation exotique : on sert /public tel quel
// (HDRI, GLB DRACO, décodeur DRACO) et on laisse Three.js charger ses addons en ESM.
// `base` est configurable pour que le jeu puisse être servi ailleurs qu'à la
// racine d'un domaine. Le site Lire Marx le sert sous /jeu/ : il construit avec
// VITE_BASE=/jeu/, et les chemins d'actifs du runtime (HDRI, décodeur DRACO)
// passent par import.meta.env.BASE_URL — voir src/assets/AssetManager.js.
// Sans la variable, rien ne change : base '/', dev et déploiement autonome
// se comportent exactement comme avant.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
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
