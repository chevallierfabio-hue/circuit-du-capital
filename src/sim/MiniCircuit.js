// src/sim/MiniCircuit.js — interface stable du stub de simulation.
//
// v66 contient un "moteur économique" (SimulationState, ProductionSystem,
// CompetitionSystem, MarketSystem, LaborSystem, CrisisSystem, CreditSystem,
// StateSystem, CapitalCircuit, EventLog) orchestré par un objet MiniCircuit
// = { runCycle, snapshot, ... }. On l'expose derrière une interface fine —
// les modules graphiques ne référencent pas les classes internes.
//
// M1+ remplacera l'implémentation par le vrai CapitalCircuit "économique"
// sans toucher à cette interface : les modules clients (HUD, panneaux,
// boucle de jeu) ne bougeront pas.

import {
  SimulationState, ProductionSystem, CompetitionSystem, MarketSystem,
  LaborSystem, CrisisSystem, CreditSystem, StateSystem,
  CapitalCircuit, EventLog, MiniCircuit, runCycle, state, log, circuit,
} from '../app.js';

// Interface stable.
export const Sim = {
  /** L'état courant — lecture seule pour les modules graphiques. */
  get state(){ return state; },
  /** Le journal narratif. */
  get log(){ return log; },
  /** Fait avancer le circuit d'un cycle. */
  runCycle,
  /** Capture brève (cycle, age, argent) — utile aux HUD et test. */
  snapshot(){
    return { cycle: state.cycle, age: state.age, argent: state.argent };
  },
};

export {
  SimulationState, ProductionSystem, CompetitionSystem, MarketSystem,
  LaborSystem, CrisisSystem, CreditSystem, StateSystem,
  CapitalCircuit, EventLog, MiniCircuit, runCycle, state, log, circuit,
};
