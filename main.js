// main.js — boot de l'application : auth, wiring des handlers, et exposition
// sur window des fonctions référencées par les onclick="" du HTML existant
// (le HTML n'a volontairement pas été réécrit, pour limiter le risque de régression).

import { initState } from './state.js';
import { initAuth, doLogout, saveFirebase } from './firebase.js';
import {
  build, addSynthCol, resetAll, exportCSV,
  openHistorique, closeHistorique, renderHistTable, clearHistFilter
} from './ui-supermarche.js';
import { openChart, closeChart, switchSection, switchTab } from './chart.js';
import {
  buildRassemblement, addRassemSection, toggleShowRecus,
  exportManquantsCSV, printRassemblement
} from './ui-rassemblement.js';
import { openStats, closeStats, switchStatsTab } from './stats.js';

// ─── Onglets principaux (Supermarché / Rassemblement) ────────────────────────
function switchMainTab(tab) {
  var isSuivi = tab === 'suivi';
  document.getElementById('tabViewSuivi').classList.toggle('active', isSuivi);
  document.getElementById('tabViewManquants').classList.toggle('active', !isSuivi);
  document.getElementById('panelSuivi').classList.toggle('active', isSuivi);
  document.getElementById('panelManquants').classList.toggle('active', !isSuivi);
}

// ─── Fonctions exposées sur window pour les onclick="" du HTML ──────────────
Object.assign(window, {
  switchMainTab,
  doLogout,
  saveFirebase,
  resetAll,
  exportCSV,
  openHistorique,
  closeHistorique,
  renderHistTable,
  clearHistFilter,
  addSynthCol,
  openChart,
  closeChart,
  switchSection,
  switchTab,
  addRassemSection,
  toggleShowRecus,
  exportManquantsCSV,
  printRassemblement,
  openStats,
  closeStats,
  switchStatsTab,
});

// ─── Fermeture des modals au clic sur l'overlay ──────────────────────────────
['histOverlay', 'chartOverlay', 'statsOverlay'].forEach(function (id) {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────
function finishBoot() {
  build();
  buildRassemblement();
}

var now = new Date();
document.getElementById('dateJour').value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
initState();

initAuth(function () {
  finishBoot();
});
