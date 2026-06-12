// src/world/MapBuilder.js — facade M0.
// Le bulk de la construction de carte (buildWorld, ground texture, zones,
// rues, eau, horizon, ciel) vit dans src/app.js en M0. Ce module ré-expose
// l'API pour respecter le découpage annoncé : la mission M1+ déplacera
// progressivement le code ici, fonction par fonction, sans changer le rendu.
export { buildWorld, defineZone, zones, zoneGroups, obstacles, HALF } from '../app.js';
