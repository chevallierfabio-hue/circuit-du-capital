// src/world/buildings/ — facade M0.
// Les builders de bâtiments par zone (buildBanque, buildUsine, buildMarche,
// buildEntrepot, buildQuartier, buildEtat, buildPort, buildBourse, etc.)
// vivent encore dans src/app.js et sont câblés via defineZone(). M1+ migrera
// chacun dans son fichier (Banque.js, Usine.js, ...). Pour l'instant ce
// dossier matérialise la promesse de découpage annoncée dans la brief M0.
export const STATUS = 'facade M0 — builders dans src/app.js';
