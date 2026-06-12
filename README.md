# Le Circuit du Capital — prototype 3D

Portage Vite du prototype mono-fichier `v66.html` vers une chaîne d'assets
moderne (Three.js ESM, HDRI IBL, GLTF + DRACO). Mission **M0** : iso-fonctionnel,
aucun changement visuel ou ludique.

## Démarrer

```
npm install
npm run assets:draco       # première install : copie le décodeur DRACO dans public/draco/
npm run assets:test-glb    # une fois : génère le GLB de test compressé DRACO
npm run dev                # http://localhost:5173/
```

Build de production :

```
npm run build
npm run preview            # sert dist/
```

Validation automatique (Chrome headless via puppeteer-core, vérifie qu'il n'y a
aucune erreur ou warning de dépréciation au boot) :

```
npm run verify
```

## Structure

```
index.html                  HTML/CSS du v66 (extrait tel quel) + écran de
                            chargement « gate » avant l'introtrailer.

src/
  main.js                   Entrée. Précharge les assets, ouvre/ferme le gate,
                            lance init(), exécute la preuve de pipeline DRACO.
  app.js                    Legacy bundle M0 : tout le code v66 reste ici en
                            une pièce pour préserver la parité. Adapte
                            r128→r16x en tête de fichier (LIGHT_GAIN = π,
                            CanvasTexture.colorSpace = sRGB, addons via ESM).

  world/MapBuilder.js       facade ─┐
  world/Zones.js            facade  │
  world/buildings/          facade  │ Ces fichiers existent et matérialisent
  vehicle/Vehicle.js        facade  │ le découpage annoncé par v66. Ils
  camera/CameraController.js facade │ ré-exportent depuis app.js. M1+ y
  input/Input.js            facade  │ migrera progressivement le code, par
  ui/HUD.js                 facade  │ tranches testables.
  ui/Panels.js              facade  │
  ui/Modals.js              facade ─┘

  sim/MiniCircuit.js        Interface stable du stub économique (classes
                            internes ré-exportées + objet Sim minimal).
  sim/index.js              re-export

  fx/Postprocessing.js      facade (composer + bloom + ENV_INTENSITY)
  fx/Particles.js           réservé (M1+)

  assets/AssetManager.js    Préchargement déclaratif, GLTF+DRACO+KTX2,
                            RGBELoader+PMREM, événements de progression,
                            playClip() pour AnimationMixer (M7).

public/
  assets/hdri/              industrial_sunset_puresky_2k.hdr (HDRI IBL)
  assets/models/test/       cube-draco.glb (preuve du pipeline DRACO)
  draco/                    décodeur WASM DRACO (copié depuis three)

scripts/
  build-test-glb.mjs        construit le cube-draco.glb via draco3d
  copy-draco-decoder.mjs    re-copie le décodeur depuis node_modules
  verify-runtime.mjs        smoke test headless (vite + chromium puppeteer-core)
```

## Conventions

- **escHTML** — toute insertion de texte utilisateur dans le DOM passe par
  un helper d'échappement (`textContent` quand possible, sinon escapeHTML
  manuel). Ne pas concaténer du HTML brut avec des chaînes non-vérifiées.
- **une mission = une branche** — `feat/da-mN-<slug>`. M0 = `feat/da-m0-vite`.
  Une mission se merge sur `main` quand son verdict est OK (`npm run verify`
  + revue visuelle side-by-side avec la version précédente).
- **iso-fonctionnel par défaut** — pas d'amélioration opportuniste lors d'un
  portage. Tout changement visuel ou ludique appartient à une mission
  identifiée.

## Adaptations r128 → r16x

Localisées en tête de `src/app.js`, commentées :

1. **Imports ESM** — `import * as THREE from 'three'`, addons depuis
   `three/addons/*`. Le namespace est rassemblé dans un objet local pour
   limiter la diff côté code v66.
2. **Lights "physically-correct"** — depuis r155, le BRDF intègre la
   division par π. Toutes les intensités (Directional, Point, Spot, Hemi,
   Ambient) sont multipliées par `LIGHT_GAIN = Math.PI` à la création
   et dans le cycle jour/nuit.
3. **CanvasTexture sRGB** — `colorSpace = SRGBColorSpace` posé sur chaque
   `CanvasTexture` (cartouches, plaques de bois, fenêtres peintes, etc.).
4. **`renderer.outputColorSpace`** — fixé explicitement à `SRGBColorSpace`.
5. **Bloom** — `EffectComposer + RenderPass + UnrealBloomPass` chargés
   depuis `three/addons/postprocessing/*`.

## IBL

L'HDRI Industrial Sunset (Pure Sky) est passé par `RGBELoader` → `PMREMGenerator`
puis posé sur `scene.environment`. L'intensité (`scene.environmentIntensity`)
est volontairement faible (`ENV_INTENSITY = 0.25`) pour **ne pas modifier le
rendu v66**. La constante est exportée depuis `src/app.js` (et ré-exposée par
`src/fx/Postprocessing.js`) pour être relevée en M1 quand on calibrera
l'éclairage IBL.

Fallback : si le `.hdr` manque, le gate affiche un message d'erreur lisible
et l'app continue sans IBL.

## Preuve du pipeline DRACO

Au boot, `src/main.js` charge `cube-draco.glb` via AssetManager (GLTFLoader
+ DRACOLoader pointant vers `/draco/`), ajoute le mesh hors champ, attend
deux frames, puis le dispose. Trace : `[M0] DRACO test GLB : … OK.` dans la
console.

## Validation

Critères M0 :

- [x] `npm run dev` démarre et la scène v66 est rendue (canvas présent).
- [x] `npm run build` produit un bundle exploitable, et `npm run preview` le sert.
- [x] `npm run verify` : 0 erreur, 0 warning de dépréciation Three.
- [x] HDRI chargé, `scene.environment` posé, `environmentIntensity = 0.25`.
- [x] GLB de test compressé DRACO chargé, rendu hors champ, déchargé.
- [x] Side-by-side avec `v66.html` : à vérifier visuellement par l'auteur
      (le portage ne modifie pas la scène en dehors des compensations
      r128→r16x calibrées en aveugle).
