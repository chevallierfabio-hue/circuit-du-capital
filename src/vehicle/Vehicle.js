// src/vehicle/Vehicle.js — facade M0. Le namespace Vehicle = { build, update,
// place(), reset() } est déjà bien isolé dans v66 ; il sera extrait
// physiquement en M1 (le code y dépend de scene, camera, obstacles et de la
// classe THREE patchée — autant de bindings que app.js expose déjà).
export { Vehicle } from '../app.js';
