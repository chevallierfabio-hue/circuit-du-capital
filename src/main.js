// src/main.js — entrée de l'application.
//
// Séquence M0 :
//   1. Précharger les assets (HDRI, GLB DRACO de test) via AssetManager,
//      barre de progression dans le gate.
//   2. Lancer init() du legacy bundle, en lui passant la texture HDR brute
//      (le PMREM est compilé une fois le renderer créé, à l'intérieur).
//   3. Fermer le gate, lancer la preuve de pipeline DRACO (charge le GLB
//      de test, render 1 frame hors champ, log OK, dispose).
//
// Aucun changement visuel ou ludique : le jeu démarre exactement comme v66,
// précédé d'un court écran de chargement.

import { init, scene, renderer, THREE, ENV_INTENSITY } from './app.js';
import { AssetManager, DEFAULT_MANIFEST, playClip } from './assets/AssetManager.js';

const $ = (id) => document.getElementById(id);

const gate    = $('gate');
const gateBar = $('gate-bar');
const gateMsg = $('gate-msg');
const gateErr = $('gate-err');

function setGateProgress(done, total){
  const pct = total ? Math.round((done/total)*100) : 0;
  // La barre occupe 100 % et se révèle par scaleX : animer `width` forçait
  // un recalcul de mise en page à chaque frame du préchargement.
  if (gateBar) gateBar.style.transform = `scaleX(${pct / 100})`;
}
function setGateMessage(m){ if (gateMsg) gateMsg.textContent = m; }
function appendGateError(m){
  if (!gateErr) return;
  gateErr.textContent = gateErr.textContent
    ? `${gateErr.textContent} · ${m}`
    : m;
}

const am = new AssetManager();
am.on(ev => {
  if (typeof ev.done==='number' && typeof ev.total==='number') {
    setGateProgress(ev.done, ev.total);
  }
  if (ev.message && ev.phase!=='error') setGateMessage(ev.message);
  if (ev.phase==='error') appendGateError(ev.message);
});

// 1. Précharger.
let assets;
try {
  assets = await am.preload(DEFAULT_MANIFEST);
} catch (e) {
  appendGateError(`Préchargement interrompu : ${e.message||e}`);
  assets = { hdri:{}, models:{} };
}

// 2. Boot du jeu.
setGateMessage('Construction de la scène…');
init({ hdrTexture: assets.hdri.sunset || null });

// KTX2 supporte le renderer maintenant qu'il existe.
am.setRenderer(renderer);

// Fermeture du gate (transition CSS .4s sur .gate.hidden).
if (gate) {
  gate.classList.add('hidden');
  setTimeout(() => { gate.style.display = 'none'; }, 500);
}

// 3. Preuve du pipeline DRACO : charge OK ⇒ on rajoute hors champ, on
// render 1 frame (déjà déclenchée par la loop principale), puis on dispose.
//    Log lisible que l'on garde dans la console pour la validation M0.
function provePipelineDRACO(gltf){
  if (!gltf || !gltf.scene) {
    console.warn('[M0] GLB de test absent — DRACO non vérifié à l\'exécution.\n'
      + '       Lancez : npm run assets:test-glb');
    return;
  }
  const ghost = gltf.scene;
  // Position hors champ (sous la carte, loin du sol et de la caméra).
  ghost.position.set(1e5, -1e5, 1e5);
  ghost.visible = true;
  scene.add(ghost);
  // Une frame s'est déjà écoulée au moment où on entre ici (init a appelé
  // loop). On programme le dispose juste après deux frames pour garantir
  // qu'au moins un render a eu lieu avec le ghost présent.
  let f = 0;
  function tick(){
    f++;
    if (f<2) { requestAnimationFrame(tick); return; }
    scene.remove(ghost);
    ghost.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) m.dispose && m.dispose();
    });
    console.info('[M0] DRACO test GLB : chargé, rendu hors champ pendant 2 frames, déchargé. OK.');
  }
  requestAnimationFrame(tick);
  // Bonus : si le test GLB transporte des animations, on prépare un mixer
  // (utilisé en M7 pour les vraies animations).
  if (gltf.animations && gltf.animations.length) {
    const mixer = playClip(gltf);
    if (mixer) console.info('[M0] playClip ready (mixer pour AnimationMixer M7).');
  }
}
provePipelineDRACO(assets.models.test);

// Récapitulatif console — utile pour la validation visuelle iso-fonctionnelle.
console.info(
  `[M0] Boot OK · three ${THREE.REVISION} · `
  + `IBL ${assets.hdri.sunset ? `intensity=${ENV_INTENSITY}` : 'absent (fallback)'} · `
  + `DRACO ${assets.models.test ? 'OK' : 'absent'}`
);
