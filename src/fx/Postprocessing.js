// src/fx/Postprocessing.js — facade M0. Le composer + UnrealBloomPass v66
// vivent dans src/app.js pour rester collés à la création du renderer.
// On ré-expose les poignées (composer, bloomPass) en live bindings et
// la constante d'intensité IBL exposée pour M1.
export { composer, bloomPass, ENV_INTENSITY } from '../app.js';
