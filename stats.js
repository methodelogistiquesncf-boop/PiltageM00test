// stats.js — modal Statistiques Rassemblement

import { state, todayISO } from './state.js';

let currentStatsTab = 'global';

export function openStats() {
  document.getElementById('statsOverlay').classList.add('open');
  switchStatsTab('global');
}
export function closeStats() {
  document.getElementById('statsOverlay').classList.remove('open');
}

export function switchStatsTab(tab) {
  currentStatsTab = tab;
  ['global', 'delais', 'engins', 'cadence', 'top'].forEach(function (t) {
    document.getElementById('statsTab_' + t).classList.toggle('active', t === tab);
    document.getElementById('statsPanel_' + t).classList.toggle('active', t === tab);
  });
  renderStatsTab(tab);
}

// ── Calcul des données de base ────────────────────────────────────────────
function getAllRows() {
  var rows = [];
  state.rassemblement.forEach(function (sec) {
    sec.rows.forEach(function (row) { rows.push({ sec: sec, row: row }); });
  });
  return rows;
}

function diffDays(isoA, isoB) {
  if (!isoA || !isoB) return null;
  var a = new Date(isoA), b = new Date(isoB);
  return Math.round((b - a) / 86400000);
}

function renderStatsTab(tab) {
  if (tab === 'global') renderStatsGlobal();
  if (tab === 'delais') renderStatsDelais();
  if (tab === 'engins') renderStatsEngins();
  if (tab === 'cadence') renderStatsCadence();
  if (tab === 'top') renderStatsTop();
}

// ── Tab : Vue globale ───────────────────────────────────────────────────────
function renderStatsGlobal() {
  var all = getAllRows();
  var total = all.length;
  var recus = all.filter(function (x) { return x.row.recu; }).length;
  var actifs = total - recus;
  var tauxReception = total > 0 ? Math.round((recus / total) * 100) : 0;

  var today = todayISO();
  var enRetard = all.filter(function (x) {
    if (x.row.recu) return false;
    if (!x.sec.date) return false;
    var d = diffDays(x.sec.date, today);
    return d !== null && d > 3;
  }).length;

  var delaisMoy = null;
  var delaisList = all.filter(function (x) { return x.row.recu && x.sec.date && x.row.dateRecu; })
    .map(function (x) { return diffDays(x.sec.date, x.row.dateRecu); })
    .filter(function (d) { return d !== null && d >= 0; });
  if (delaisList.length > 0) {
    delaisMoy = Math.round(delaisList.reduce(function (s, d) { return s + d; }, 0) / delaisList.length * 10) / 10;
  }

  var datesSet = {};
  state.rassemblement.forEach(function (sec) { if (sec.date) datesSet[sec.date] = true; });
  var nbDates = Object.keys(datesSet).length;

  var w = document.getElementById('statsPanel_global');
  w.innerHTML = '';

  var kpis = [
    { label: 'Articles totaux', value: total, color: '#1a4fa0', icon: '📦' },
    { label: 'Reçus', value: recus, color: '#22a050', icon: '✅' },
    { label: 'En attente', value: actifs, color: actifs > 0 ? '#d03030' : '#22a050', icon: '⏳' },
    { label: 'En retard (> 3j)', value: enRetard, color: enRetard > 0 ? '#d03030' : '#22a050', icon: '🚨' },
    { label: 'Taux de réception', value: tauxReception + '%', color: tauxReception >= 80 ? '#22a050' : tauxReception >= 50 ? '#f5a623' : '#d03030', icon: '📊' },
    { label: 'Délai moyen', value: delaisMoy !== null ? delaisMoy + ' j' : '—', color: '#7a776f', icon: '⏱' },
    { label: 'Dates de rassemblement', value: nbDates, color: '#1a4fa0', icon: '📅' },
  ];

  var grid = document.createElement('div');
  grid.className = 'stats-kpi-grid';
  kpis.forEach(function (k) {
    var card = document.createElement('div');
    card.className = 'stats-kpi-card';
    card.innerHTML = '<div class="kpi-icon">' + k.icon + '</div>'
      + '<div class="kpi-value" style="color:' + k.color + '">' + k.value + '</div>'
      + '<div class="kpi-label">' + k.label + '</div>';
    grid.appendChild(card);
  });
  w.appendChild(grid);

  var barWrap = document.createElement('div');
  barWrap.className = 'stats-progress-wrap';
  barWrap.innerHTML = '<div class="stats-progress-label">Avancement global</div>'
    + '<div class="stats-progress-bar"><div class="stats-progress-fill" style="width:' + tauxReception + '%;background:' + (tauxReception >= 80 ? '#22a050' : tauxReception >= 50 ? '#f5a623' : '#d03030') + '"></div></div>'
    + '<div class="stats-progress-pct">' + tauxReception + '% reçus (' + recus + ' / ' + total + ')</div>';
  w.appendChild(barWrap);

  if (total > 0) {
    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'stats-donut-wrap';
    var canvas = document.createElement('canvas');
    canvas.id = 'donutGlobal';
    canvas.width = 220; canvas.height = 220;
    canvasWrap.appendChild(canvas);
    w.appendChild(canvasWrap);
    requestAnimationFrame(function () { drawDonut(canvas, recus, actifs, enRetard); });
  }

  if (total === 0) {
    var empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'Aucun article dans le Rassemblement.';
    w.appendChild(empty);
  }
}

function drawDonut(canvas, recus, actifs_sans_retard, enRetard) {
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var cx = W / 2, cy = H / 2, R = 80, r = 48;
  ctx.clearRect(0, 0, W, H);

  var segments = [];
  if (recus > 0) segments.push({ v: recus, color: '#22a050', label: 'Reçus' });
  if (enRetard > 0) segments.push({ v: enRetard, color: '#d03030', label: 'Retard >3j' });
  var actifs_ok = (actifs_sans_retard) - enRetard;
  if (actifs_ok > 0) segments.push({ v: actifs_ok, color: '#f5a623', label: 'En attente' });

  var total = segments.reduce(function (s, x) { return s + x.v; }, 0);
  if (total === 0) return;

  var angle = -Math.PI / 2;
  segments.forEach(function (seg) {
    var sweep = (seg.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  var tauxGlobal = Math.round((recus / total) * 100);
  ctx.fillStyle = '#1a1917';
  ctx.font = 'bold 22px Segoe UI,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tauxGlobal + '%', cx, cy - 6);
  ctx.font = '10px Segoe UI,sans-serif';
  ctx.fillStyle = '#7a776f';
  ctx.fillText('réceptionné', cx, cy + 10);

  var legY = H - 38;
  var legX = 10;
  segments.forEach(function (seg) {
    ctx.fillStyle = seg.color;
    ctx.fillRect(legX, legY, 12, 12);
    ctx.fillStyle = '#333';
    ctx.font = '10px Segoe UI,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(seg.label + ' (' + seg.v + ')', legX + 16, legY + 1);
    legX += ctx.measureText(seg.label + ' (' + seg.v + ')').width + 30;
  });
}

// ── Tab : Délais ─────────────────────────────────────────────────────────────
function renderStatsDelais() {
  var all = getAllRows();
  var today = todayISO();
  var w = document.getElementById('statsPanel_delais');
  w.innerHTML = '';

  var enAttente = all.filter(function (x) { return !x.row.recu && x.sec.date; });
  enAttente.sort(function (a, b) { return a.sec.date.localeCompare(b.sec.date); });

  var delaisRecu = all.filter(function (x) { return x.row.recu && x.sec.date && x.row.dateRecu; })
    .map(function (x) { return { row: x.row, sec: x.sec, jours: diffDays(x.sec.date, x.row.dateRecu) }; })
    .filter(function (x) { return x.jours !== null && x.jours >= 0; });

  if (delaisRecu.length > 0) {
    var vals = delaisRecu.map(function (x) { return x.jours; });
    var moy = Math.round(vals.reduce(function (s, v) { return s + v; }, 0) / vals.length * 10) / 10;
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);

    var statsBar = document.createElement('div');
    statsBar.className = 'stats-kpi-grid stats-kpi-grid-small';
    [
      { label: 'Délai moyen', value: moy + ' j', color: '#1a4fa0', icon: '⏱' },
      { label: 'Délai min', value: min + ' j', color: '#22a050', icon: '⚡' },
      { label: 'Délai max', value: max + ' j', color: '#d03030', icon: '🐢' },
      { label: 'Réceptions analysées', value: delaisRecu.length, color: '#7a776f', icon: '📋' },
    ].forEach(function (k) {
      var card = document.createElement('div');
      card.className = 'stats-kpi-card';
      card.innerHTML = '<div class="kpi-icon">' + k.icon + '</div><div class="kpi-value" style="color:' + k.color + '">' + k.value + '</div><div class="kpi-label">' + k.label + '</div>';
      statsBar.appendChild(card);
    });
    w.appendChild(statsBar);

    var title = document.createElement('div');
    title.className = 'stats-section-title';
    title.textContent = 'Distribution des délais de réception';
    w.appendChild(title);

    var canvasWrap = document.createElement('div'); canvasWrap.style.marginBottom = '20px';
    var canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.height = 160;
    canvasWrap.appendChild(canvas);
    w.appendChild(canvasWrap);
    requestAnimationFrame(function () { drawDelaisHisto(canvas, vals); });
  }

  if (enAttente.length > 0) {
    var title2 = document.createElement('div');
    title2.className = 'stats-section-title';
    title2.textContent = 'Articles en attente — ancienneté';
    w.appendChild(title2);

    var table = document.createElement('table');
    table.className = 'stats-table';
    table.innerHTML = '<thead><tr><th>Date</th><th>Engin</th><th>Kit</th><th>Désignation</th><th>Ancienneté</th><th>Statut</th></tr></thead>';
    var tbody = document.createElement('tbody');
    enAttente.forEach(function (x) {
      var jours = diffDays(x.sec.date, today);
      var statut = jours === null ? '—' : jours > 7 ? '🔴 ' + jours + 'j' : jours > 3 ? '🟠 ' + jours + 'j' : '🟢 ' + jours + 'j';
      var tr = document.createElement('tr');
      if (jours !== null && jours > 7) tr.className = 'stats-row-alert';
      else if (jours !== null && jours > 3) tr.className = 'stats-row-warn';
      tr.innerHTML = '<td>' + (x.sec.date ? x.sec.date.split('-').reverse().join('/') : '—') + '</td>'
        + '<td>' + (x.row.engin || '—') + '</td>'
        + '<td>' + (x.row.kit || '—') + '</td>'
        + '<td>' + (x.row.designation || '—') + '</td>'
        + '<td>' + statut + '</td>'
        + '<td><span class="stats-badge stats-badge-pending">En attente</span></td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    w.appendChild(table);
  }

  if (delaisRecu.length === 0 && enAttente.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'Pas assez de données pour calculer les délais.';
    w.appendChild(empty);
  }
}

function drawDelaisHisto(canvas, vals) {
  var ctx = canvas.getContext('2d');
  var W = canvas.offsetWidth || 800;
  canvas.width = W;
  var H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  var buckets = [
    { label: '0 j', min: 0, max: 0 }, { label: '1 j', min: 1, max: 1 },
    { label: '2 j', min: 2, max: 2 }, { label: '3 j', min: 3, max: 3 },
    { label: '4-7 j', min: 4, max: 7 }, { label: '>7 j', min: 8, max: 9999 }
  ];
  var counts = buckets.map(function (b) { return vals.filter(function (v) { return v >= b.min && v <= b.max; }).length; });
  var maxCount = Math.max.apply(null, counts) || 1;

  var PAD = { top: 20, right: 20, bottom: 35, left: 40 };
  var cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  var barW = cW / buckets.length - 8;

  counts.forEach(function (count, i) {
    var x = PAD.left + i * (cW / buckets.length) + 4;
    var bH = (count / maxCount) * cH;
    var color = i >= 4 ? '#d03030' : i === 3 ? '#f5a623' : '#22a050';
    ctx.fillStyle = color;
    ctx.fillRect(x, PAD.top + cH - bH, barW, bH);
    ctx.fillStyle = '#333'; ctx.font = 'bold 11px Segoe UI,sans-serif'; ctx.textAlign = 'center';
    if (count > 0) ctx.fillText(count, x + barW / 2, PAD.top + cH - bH - 4);
    ctx.fillStyle = '#666'; ctx.font = '10px Segoe UI,sans-serif';
    ctx.fillText(buckets[i].label, x + barW / 2, H - PAD.bottom + 14);
  });
}

// ── Tab : Par engin ──────────────────────────────────────────────────────────
function renderStatsEngins() {
  var all = getAllRows();
  var w = document.getElementById('statsPanel_engins');
  w.innerHTML = '';

  var enginsSet = {};
  all.forEach(function (x) { var e = (x.row.engin || '').trim(); if (e) enginsSet[e] = true; });
  var engins = Object.keys(enginsSet).sort();

  if (engins.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'Aucun champ Engin renseigné dans les lignes du Rassemblement.';
    w.appendChild(empty);
    return;
  }

  var grid = document.createElement('div');
  grid.className = 'stats-engin-grid';

  engins.forEach(function (engin) {
    var rows = all.filter(function (x) { return (x.row.engin || '').trim() === engin; });
    var total = rows.length;
    var recus = rows.filter(function (x) { return x.row.recu; }).length;
    var actifs = total - recus;
    var taux = total > 0 ? Math.round((recus / total) * 100) : 0;

    var today = todayISO();
    var retard = rows.filter(function (x) {
      if (x.row.recu) return false;
      if (!x.sec.date) return false;
      var d = diffDays(x.sec.date, today);
      return d !== null && d > 3;
    }).length;

    var card = document.createElement('div');
    card.className = 'stats-engin-card';
    card.innerHTML = '<div class="engin-card-title">' + engin + '</div>'
      + '<div class="engin-card-kpis">'
      + '<span class="engin-kpi"><span class="engin-kpi-val" style="color:#1a4fa0">' + total + '</span><span class="engin-kpi-lbl">total</span></span>'
      + '<span class="engin-kpi"><span class="engin-kpi-val" style="color:#22a050">' + recus + '</span><span class="engin-kpi-lbl">reçus</span></span>'
      + '<span class="engin-kpi"><span class="engin-kpi-val" style="color:' + (actifs > 0 ? '#d03030' : '#22a050') + '">' + actifs + '</span><span class="engin-kpi-lbl">attente</span></span>'
      + '<span class="engin-kpi"><span class="engin-kpi-val" style="color:' + (retard > 0 ? '#d03030' : '#22a050') + '">' + retard + '</span><span class="engin-kpi-lbl">retard</span></span>'
      + '</div>'
      + '<div class="engin-card-bar"><div class="engin-card-fill" style="width:' + taux + '%;background:' + (taux >= 80 ? '#22a050' : taux >= 50 ? '#f5a623' : '#d03030') + '"></div></div>'
      + '<div class="engin-card-taux">' + taux + '% réceptionné</div>';
    grid.appendChild(card);
  });
  w.appendChild(grid);

  var title = document.createElement('div');
  title.className = 'stats-section-title';
  title.textContent = 'Comparaison par engin';
  w.appendChild(title);

  var canvasWrap = document.createElement('div'); canvasWrap.style.marginBottom = '20px';
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%'; canvas.height = 200;
  canvasWrap.appendChild(canvas);
  w.appendChild(canvasWrap);

  requestAnimationFrame(function () {
    var data = engins.map(function (engin) {
      var rows = all.filter(function (x) { return (x.row.engin || '').trim() === engin; });
      var total = rows.length;
      var recus = rows.filter(function (x) { return x.row.recu; }).length;
      return { label: engin, recus: recus, actifs: total - recus };
    });
    drawEnginsBar(canvas, data);
  });
}

function drawEnginsBar(canvas, data) {
  var ctx = canvas.getContext('2d');
  var W = canvas.offsetWidth || 800;
  canvas.width = W;
  var H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  var n = data.length;
  if (n === 0) return;

  var PAD = { top: 20, right: 20, bottom: 40, left: 45 };
  var cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  var maxVal = Math.max.apply(null, data.map(function (d) { return d.recus + d.actifs; })) || 1;
  var groupW = cW / n;
  var barW = (groupW * 0.7) / 2;

  for (var g = 0; g <= 5; g++) {
    var val = Math.round((g / 5) * maxVal);
    var y = PAD.top + cH - (g / 5) * cH;
    ctx.strokeStyle = '#e0ddd6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#888'; ctx.font = '10px Segoe UI,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(val, PAD.left - 4, y + 3);
  }

  data.forEach(function (d, i) {
    var cx = PAD.left + i * groupW + groupW / 2;

    var hRecus = (d.recus / maxVal) * cH;
    ctx.fillStyle = '#22a050';
    ctx.fillRect(cx - barW - 2, PAD.top + cH - hRecus, barW, hRecus);
    if (d.recus > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Segoe UI,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.recus, cx - barW / 2 - 2, PAD.top + cH - hRecus / 2 + 4);
    }

    var hActifs = (d.actifs / maxVal) * cH;
    ctx.fillStyle = '#d03030';
    ctx.fillRect(cx + 2, PAD.top + cH - hActifs, barW, hActifs);
    if (d.actifs > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Segoe UI,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.actifs, cx + barW / 2 + 2, PAD.top + cH - hActifs / 2 + 4);
    }

    ctx.fillStyle = '#333'; ctx.font = '11px Segoe UI,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(d.label, cx, H - PAD.bottom + 16);
  });

  ctx.fillStyle = '#22a050'; ctx.fillRect(PAD.left, 4, 12, 10);
  ctx.fillStyle = '#333'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'left'; ctx.fillText('Reçus', PAD.left + 16, 13);
  ctx.fillStyle = '#d03030'; ctx.fillRect(PAD.left + 70, 4, 12, 10);
  ctx.fillStyle = '#333'; ctx.fillText('En attente', PAD.left + 86, 13);
}

// ── Tab : Cadence ────────────────────────────────────────────────────────────
function renderStatsCadence() {
  var all = getAllRows();
  var w = document.getElementById('statsPanel_cadence');
  w.innerHTML = '';

  if (all.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'Pas de données pour calculer la cadence.';
    w.appendChild(empty);
    return;
  }

  function getWeek(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    var day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    var jan1 = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-S' + Math.ceil((((d - jan1) / 86400000) + 1) / 7).toString().padStart(2, '0');
  }

  var nouv = {}, recu = {};
  all.forEach(function (x) {
    var wk = getWeek(x.sec.date);
    if (wk) { nouv[wk] = (nouv[wk] || 0) + 1; }
    if (x.row.recu && x.row.dateRecu) {
      var wr = getWeek(x.row.dateRecu);
      if (wr) { recu[wr] = (recu[wr] || 0) + 1; }
    }
  });

  var weeks = Array.from(new Set(Object.keys(nouv).concat(Object.keys(recu)))).sort();

  if (weeks.length === 0) {
    var empty2 = document.createElement('div');
    empty2.className = 'stats-empty';
    empty2.textContent = 'Aucune date renseignée.';
    w.appendChild(empty2);
    return;
  }

  var totNouv = Object.values(nouv).reduce(function (s, v) { return s + v; }, 0);
  var totRecu = Object.values(recu).reduce(function (s, v) { return s + v; }, 0);
  var moyNouv = weeks.length > 0 ? Math.round(totNouv / weeks.length * 10) / 10 : 0;
  var moyRecu = weeks.length > 0 ? Math.round(totRecu / weeks.length * 10) / 10 : 0;

  var grid = document.createElement('div');
  grid.className = 'stats-kpi-grid stats-kpi-grid-small';
  [
    { label: 'Manquants / semaine', value: moyNouv, color: '#d03030', icon: '📉' },
    { label: 'Réceptions / semaine', value: moyRecu, color: '#22a050', icon: '📈' },
    { label: 'Semaines suivies', value: weeks.length, color: '#1a4fa0', icon: '📆' },
  ].forEach(function (k) {
    var card = document.createElement('div');
    card.className = 'stats-kpi-card';
    card.innerHTML = '<div class="kpi-icon">' + k.icon + '</div><div class="kpi-value" style="color:' + k.color + '">' + k.value + '</div><div class="kpi-label">' + k.label + '</div>';
    grid.appendChild(card);
  });
  w.appendChild(grid);

  var title = document.createElement('div');
  title.className = 'stats-section-title';
  title.textContent = 'Nouveaux manquants vs Réceptions par semaine';
  w.appendChild(title);

  var canvasWrap = document.createElement('div');
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%'; canvas.height = 220;
  canvasWrap.appendChild(canvas);
  w.appendChild(canvasWrap);

  requestAnimationFrame(function () {
    var dataPoints = weeks.map(function (wk) {
      return { label: wk.replace(/^\d{4}-/, ''), nouv: nouv[wk] || 0, recu: recu[wk] || 0 };
    });
    drawCadenceChart(canvas, dataPoints);
  });
}

function drawCadenceChart(canvas, data) {
  var ctx = canvas.getContext('2d');
  var W = canvas.offsetWidth || 800;
  canvas.width = W;
  var H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  var n = data.length;
  if (n === 0) return;

  var PAD = { top: 30, right: 30, bottom: 50, left: 45 };
  var cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  var maxVal = Math.max.apply(null, data.map(function (d) { return Math.max(d.nouv, d.recu); })) || 1;

  for (var g = 0; g <= 5; g++) {
    var val = Math.round((g / 5) * maxVal);
    var y = PAD.top + cH - (g / 5) * cH;
    ctx.strokeStyle = '#e0ddd6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#888'; ctx.font = '10px Segoe UI,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(val, PAD.left - 4, y + 3);
  }

  var step = n > 1 ? cW / (n - 1) : 0;

  function drawLine(key, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    data.forEach(function (d, i) {
      var x = n === 1 ? PAD.left + cW / 2 : PAD.left + i * step;
      var y = PAD.top + cH - (d[key] / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    data.forEach(function (d, i) {
      var x = n === 1 ? PAD.left + cW / 2 : PAD.left + i * step;
      var y = PAD.top + cH - (d[key] / maxVal) * cH;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      if (d[key] > 0) {
        ctx.fillStyle = '#1a1917'; ctx.font = 'bold 9px Segoe UI,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(d[key], x, y - 8);
      }
    });
  }

  drawLine('nouv', '#d03030');
  drawLine('recu', '#22a050');

  ctx.fillStyle = '#555'; ctx.font = '10px Segoe UI,sans-serif'; ctx.textAlign = 'center';
  data.forEach(function (d, i) {
    var x = n === 1 ? PAD.left + cW / 2 : PAD.left + i * step;
    ctx.save();
    if (n > 8) { ctx.translate(x, H - PAD.bottom + 10); ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right'; ctx.fillText(d.label, 0, 0); ctx.restore(); }
    else { ctx.fillText(d.label, x, H - PAD.bottom + 18); ctx.restore(); }
  });

  ctx.fillStyle = '#d03030'; ctx.fillRect(PAD.left, 8, 20, 3);
  ctx.beginPath(); ctx.arc(PAD.left + 10, 9.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'left'; ctx.fillText('Nouveaux manquants', PAD.left + 26, 13);
  ctx.fillStyle = '#22a050'; ctx.fillRect(PAD.left + 160, 8, 20, 3);
  ctx.beginPath(); ctx.arc(PAD.left + 170, 9.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333'; ctx.fillText('Réceptions', PAD.left + 186, 13);
}

// ── Tab : Top articles ────────────────────────────────────────────────────────
function renderStatsTop() {
  var all = getAllRows();
  var w = document.getElementById('statsPanel_top');
  w.innerHTML = '';

  if (all.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'stats-empty';
    empty.textContent = 'Aucun article dans le Rassemblement.';
    w.appendChild(empty);
    return;
  }

  function buildTopList(keyFn, label) {
    var counts = {};
    all.forEach(function (x) {
      var k = (keyFn(x) || '').trim();
      if (!k) return;
      if (!counts[k]) counts[k] = { total: 0, recu: 0 };
      counts[k].total++;
      if (x.row.recu) counts[k].recu++;
    });
    var sorted = Object.keys(counts).map(function (k) {
      return { key: k, total: counts[k].total, recu: counts[k].recu, actifs: counts[k].total - counts[k].recu };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 10);
    return { label: label, items: sorted };
  }

  var topKits = buildTopList(function (x) { return x.row.kit; }, 'Kit');
  var topSymb = buildTopList(function (x) { return x.row.symbole; }, 'Symbole');
  var topDesig = buildTopList(function (x) { return x.row.designation; }, 'Désignation');

  [topKits, topSymb, topDesig].forEach(function (top) {
    if (top.items.length === 0) return;

    var title = document.createElement('div');
    title.className = 'stats-section-title';
    title.textContent = 'Top ' + top.label + 's récurrents';
    w.appendChild(title);

    var maxTotal = top.items[0].total;
    var list = document.createElement('div');
    list.className = 'stats-top-list';

    top.items.forEach(function (item, i) {
      var row = document.createElement('div');
      row.className = 'stats-top-row';
      var pct = Math.round((item.recu / item.total) * 100);
      row.innerHTML = '<span class="top-rank">' + (i + 1) + '</span>'
        + '<span class="top-key">' + item.key + '</span>'
        + '<div class="top-bar-wrap"><div class="top-bar-fill" style="width:' + Math.round((item.total / maxTotal) * 100) + '%;background:#1a4fa0"></div></div>'
        + '<span class="top-count">' + item.total + 'x</span>'
        + '<span class="top-recu" style="color:' + (pct === 100 ? '#22a050' : pct > 0 ? '#f5a623' : '#d03030') + '">' + pct + '% reçu</span>';
      list.appendChild(row);
    });
    w.appendChild(list);
  });
}
