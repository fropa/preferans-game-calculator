const app = {
  players: [],
  currentPlayerIndex: 0,
  pulya: 0, // GLOBAL ONLY
};

const STORAGE_KEY_SETUP = "preferans:setup:v1";
const STORAGE_KEY_HISTORY = "preferans:history:v1";
const MAX_HISTORY_GAMES = 50;
const DEFAULT_PLAYER_COUNT = 4;
const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 4;

let setupPlayerCount = DEFAULT_PLAYER_COUNT;
let historyTab = "games";

/* helpers */
function qs(id) {
  return document.getElementById(id);
}

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  qs(id).classList.remove("hidden");
}

function num(v) {
  if (typeof v === "string") {
    // Accept comma decimals (common in some locales) without turning them into 0.
    v = v.replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2);
}

function loadSetupDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETUP);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return;

    if (typeof data.pulya !== "undefined") qs("game-pulya").value = data.pulya;
    if (typeof data.p0 === "string") qs("player-name-0").value = data.p0;
    if (typeof data.p1 === "string") qs("player-name-1").value = data.p1;
    if (typeof data.p2 === "string") qs("player-name-2").value = data.p2;
    if (typeof data.p3 === "string") qs("player-name-3").value = data.p3;
    if (typeof data.count === "number") setPlayerCount(data.count, false);
  } catch {
    // Ignore storage errors or corrupted JSON.
  }
}

function saveSetupDraft() {
  try {
    const data = {
      pulya: qs("game-pulya")?.value ?? "",
      p0: qs("player-name-0")?.value ?? "",
      p1: qs("player-name-1")?.value ?? "",
      p2: qs("player-name-2")?.value ?? "",
      p3: qs("player-name-3")?.value ?? "",
      count: setupPlayerCount,
    };
    localStorage.setItem(STORAGE_KEY_SETUP, JSON.stringify(data));
  } catch {
    // Ignore storage errors (private mode, quota, etc).
  }
}

function setPlayerCount(count, persist = true) {
  const c = Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, num(count)));
  setupPlayerCount = c;

  const card2 = qs("player-card-2");
  const card3 = qs("player-card-3");
  const rm2 = qs("remove-player-2");
  const rm3 = qs("remove-player-3");
  const addBtn = qs("add-player-btn");

  if (card2) card2.classList.toggle("hidden", c < 3);
  if (card3) card3.classList.toggle("hidden", c < 4);

  if (c < 3) {
    const p2 = qs("player-name-2");
    if (p2) p2.value = "";
  }
  if (c < 4) {
    const p3 = qs("player-name-3");
    if (p3) p3.value = "";
  }

  // Show remove on the last active card only; never allow going below 2.
  if (rm2) rm2.classList.toggle("hidden", c !== 3);
  if (rm3) rm3.classList.toggle("hidden", c !== 4);
  if (addBtn) addBtn.disabled = c >= MAX_PLAYER_COUNT;

  if (persist) saveSetupDraft();
}

function addPlayer() {
  setPlayerCount(setupPlayerCount + 1);
}

function removeLastPlayer() {
  if (setupPlayerCount <= MIN_PLAYER_COUNT) return;
  setPlayerCount(setupPlayerCount - 1);
}

function getSelectedPlayerCount() {
  return setupPlayerCount;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(games) {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(games));
  } catch {
    // Ignore storage errors (private mode, quota, etc).
  }
}

function addGameToHistory(game) {
  const games = loadHistory();
  games.unshift(game);
  saveHistory(games.slice(0, MAX_HISTORY_GAMES));
}

function clearHistory() {
  saveHistory([]);
  renderHistory();
}

function openHistory() {
  renderHistory();
  show("screen-history");
}

function setHistoryTab(tab) {
  historyTab = tab === "stats" ? "stats" : "games";
  renderHistory();
}

function renderHistory() {
  const list = qs("history-list");
  const summary = qs("history-summary");
  const statsEl = qs("history-stats");
  const tabGames = qs("history-tab-games");
  const tabStats = qs("history-tab-stats");
  if (!list || !summary || !statsEl || !tabGames || !tabStats) return;

  list.innerHTML = "";
  summary.innerHTML = "";
  statsEl.innerHTML = "";

  const games = loadHistory();

  tabGames.setAttribute("aria-selected", String(historyTab === "games"));
  tabStats.setAttribute("aria-selected", String(historyTab === "stats"));
  list.classList.toggle("hidden", historyTab !== "games");
  statsEl.classList.toggle("hidden", historyTab !== "stats");

  const summaryCard = document.createElement("div");
  summaryCard.className = "card";

  const uniquePlayers = new Set();
  games.forEach(g => {
    if (!g || !g.final || typeof g.final !== "object") return;
    Object.keys(g.final).forEach(name => uniquePlayers.add(name));
  });

  summaryCard.innerHTML = `
    <div class="card-kicker">Saved games</div>
    <div style="display:flex; justify-content: space-between; gap: 10px; align-items: baseline;">
      <div style="font-size: 1.5rem; font-weight: 760;">${games.length}</div>
      <div style="color: rgba(148, 163, 184, 0.95); font-size: 0.95rem;">${uniquePlayers.size} players</div>
    </div>
  `;
  summary.appendChild(summaryCard);

  if (games.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `
      <div class="card-kicker">No games saved</div>
      <div style="color: rgba(148, 163, 184, 0.95);">Finish a game and tap Calculate to store it here.</div>
    `;
    (historyTab === "stats" ? statsEl : list).appendChild(empty);
    return;
  }

  if (historyTab === "stats") {
    renderHistoryStats(statsEl, games);
    return;
  }

  games.forEach(g => {
    const card = document.createElement("div");
    card.className = "card";

    const when = (() => {
      try {
        const d = new Date(g.ts);
        if (!Number.isFinite(d.getTime())) return String(g.ts || "");
        return d.toLocaleString();
      } catch {
        return String(g.ts || "");
      }
    })();

    const final = g.final && typeof g.final === "object" ? g.final : {};
    const sorted = Object.entries(final)
      .map(([name, val]) => ({ name, val: Number(val) }))
      .filter(x => Number.isFinite(x.val))
      .sort((a, b) => (b.val - a.val) || a.name.localeCompare(b.name));

    const header = document.createElement("div");
    header.innerHTML = `
      <div class="card-kicker">${when}</div>
      <div style="display:flex; justify-content: space-between; gap: 10px; align-items: baseline;">
        <div style="font-size: 1.05rem; font-weight: 720;">Pulya ${fmt(num(g.pulya))}</div>
        <div style="color: rgba(148, 163, 184, 0.95); font-size: 0.95rem;">${num(g.N)} players</div>
      </div>
    `;
    card.appendChild(header);

    sorted.slice(0, 4).forEach((p, idx) => {
      const line = document.createElement("div");
      line.className = "result-line";
      line.innerHTML = `
        <span>#${idx + 1} ${p.name}</span>
        <span class="${p.val >= 0 ? "plus" : "minus"}">${p.val >= 0 ? "+" : ""}${fmt(p.val)}</span>
      `;
      card.appendChild(line);
    });

    list.appendChild(card);
  });
}

function renderHistoryStats(container, games) {
  const stats = {};
  let gamesWithFinal = 0;
  let tieGames = 0;

  games.forEach(g => {
    const final = g && g.final && typeof g.final === "object" ? g.final : null;
    if (!final) return;

    const entries = Object.entries(final)
      .map(([name, val]) => ({ name, val: Number(val) }))
      .filter(x => x.name && Number.isFinite(x.val));
    if (entries.length === 0) return;

    gamesWithFinal++;
    const maxVal = Math.max(...entries.map(x => x.val));
    const winners = entries.filter(x => x.val === maxVal).map(x => x.name);
    if (winners.length > 1) tieGames++;

    entries.forEach(e => {
      if (!stats[e.name]) stats[e.name] = { name: e.name, wins: 0, shared: 0, games: 0 };
      stats[e.name].games++;
    });

    if (winners.length === 1) {
      const w = winners[0];
      if (!stats[w]) stats[w] = { name: w, wins: 0, shared: 0, games: 0 };
      stats[w].wins++;
    } else {
      winners.forEach(w => {
        if (!stats[w]) stats[w] = { name: w, wins: 0, shared: 0, games: 0 };
        stats[w].shared++;
      });
    }
  });

  const rows = Object.values(stats).sort((a, b) => {
    const aTotal = a.wins + a.shared;
    const bTotal = b.wins + b.shared;
    return (bTotal - aTotal) || (b.wins - a.wins) || a.name.localeCompare(b.name);
  });

  const top = rows[0];
  const head = document.createElement("div");
  head.className = "card";
  head.innerHTML = `
    <div class="card-kicker">Wins</div>
    <div style="display:flex; justify-content: space-between; gap: 10px; align-items: baseline;">
      <div style="font-size: 1.05rem; font-weight: 720;">${top ? top.name : "N/A"}</div>
      <div style="color: rgba(148, 163, 184, 0.95); font-size: 0.95rem;">${gamesWithFinal} games, ${tieGames} ties</div>
    </div>
    <div style="margin-top: 8px; color: rgba(148, 163, 184, 0.95); font-size: 0.92rem;">
      Wins count only sole winners; ties count as "shared".
    </div>
  `;
  container.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "card-grid";
  rows.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-kicker">Player</div>
      <div style="font-size: 1.12rem; font-weight: 740; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</div>
      <div class="result-line"><span>Wins</span><span class="plus">+${p.wins}</span></div>
      <div class="result-line"><span>Shared</span><span>${p.shared}</span></div>
      <div class="result-line"><span>Games</span><span>${p.games}</span></div>
    `;
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

document.addEventListener("DOMContentLoaded", () => {
  setPlayerCount(DEFAULT_PLAYER_COUNT, false);
  loadSetupDraft();
  ["game-pulya", "player-name-0", "player-name-1", "player-name-2", "player-name-3"].forEach(id => {
    const el = qs(id);
    if (!el) return;
    el.addEventListener("input", () => saveSetupDraft());
  });
});

/* setup */
function startGame() {
  const P = num(qs("game-pulya").value);
  if (P <= 0) {
    alert("Please enter game Pulya (P)");
    return;
  }

  const desiredCount = getSelectedPlayerCount();
  const rawNames = [
    qs("player-name-0").value.trim(),
    qs("player-name-1").value.trim(),
    qs("player-name-2").value.trim(),
    qs("player-name-3").value.trim(),
  ];

  const names = rawNames.slice(0, desiredCount).filter(Boolean);

  if (names.length !== desiredCount) {
    alert(`${desiredCount} players selected: please enter ${desiredCount} names`);
    return;
  }

  // Persist names/pulya for next time.
  saveSetupDraft();

  app.pulya = P;

  app.players = names.map(name => ({
    name,
    gora: 0,
    vists: {},
  }));

  // init vists matrix (vists[payer][receiver])
  app.players.forEach(p => {
    app.players.forEach(o => {
      if (p.name !== o.name) {
        p.vists[o.name] = 0;
      }
    });
  });

  app.currentPlayerIndex = 0;
  renderInput();
  show("screen-input");
}

/* input */
function renderInput() {
  const p = app.players[app.currentPlayerIndex];
  qs("current-player-name").innerText = p.name;
  qs("gora-input").value = p.gora;

  const c = qs("whists-container");
  c.innerHTML = "";

  Object.keys(p.vists).forEach(target => {
    const div = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = `${p.name} -> ${target}`;

    const input = document.createElement("input");
    input.type = "number";
    input.value = String(p.vists[target] ?? 0);
    input.addEventListener("input", () => updateVist(target, input.value));

    div.appendChild(label);
    div.appendChild(input);
    c.appendChild(div);
  });
}

function updateVist(target, value) {
  app.players[app.currentPlayerIndex].vists[target] = num(value);
}

function savePlayerAndNext() {
  app.players[app.currentPlayerIndex].gora = num(qs("gora-input").value);

  app.currentPlayerIndex++;

  if (app.currentPlayerIndex < app.players.length) {
    renderInput();
  } else {
    renderReview();
    show("screen-review");
  }
}

/* review - Pulya shown ONCE */
function renderReview() {
  const c = qs("review-list");
  c.innerHTML = "";

  const pulyaCard = document.createElement("div");
  pulyaCard.className = "card";
  pulyaCard.innerHTML = `
    <div class="card-kicker">Pulya</div>
    <div style="font-size: 1.6rem; font-weight: 720;">${fmt(app.pulya)}</div>
  `;
  c.appendChild(pulyaCard);

  const grid = document.createElement("div");
  grid.className = "card-grid";
  app.players.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-kicker">Player</div>
      <div style="font-size: 1.15rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</div>
      <div style="margin-top: 6px; color: rgba(148, 163, 184, 0.95);">Gora ${fmt(p.gora)}</div>
    `;
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

/* FINAL - Georgian rules */
function calculateFinal() {
  const podium = qs("podium");
  const out = qs("final-results");
  podium.innerHTML = "";
  out.innerHTML = "";

  const N = app.players.length;
  // Per the described rules: (hill - minHill) * 10 / N is paid to each opponent as whists.
  const K = 10 / N;

  const gMin = Math.min(...app.players.map(p => p.gora));

  const penalty = {};
  app.players.forEach(p => {
    penalty[p.name] = (p.gora - gMin) * K;
  });

  // clone vists (vists[payer][receiver])
  const V = {};
  app.players.forEach(p => {
    V[p.name] = { ...p.vists };
  });

  // add penalties: higher gora pays everyone else
  app.players.forEach(X => {
    const px = penalty[X.name];
    if (px === 0) return;

    app.players.forEach(Y => {
      if (Y.name !== X.name) {
        V[X.name][Y.name] += px;
      }
    });
  });

  // netting
  const final = {};
  app.players.forEach(p => (final[p.name] = 0));

  for (let i = 0; i < app.players.length; i++) {
    for (let j = i + 1; j < app.players.length; j++) {
      const A = app.players[i].name;
      const B = app.players[j].name;

      // Positive means A pays B; A goes down, B goes up.
      const net = (V[A][B] || 0) - (V[B][A] || 0);
      final[A] -= net;
      final[B] += net;
    }
  }

  // Pulya context - ONCE
  const info = document.createElement("div");
  info.className = "result-line";
  info.innerHTML = `
    <strong>Pulya</strong>
    <strong>${fmt(app.pulya)}</strong>
  `;
  out.appendChild(info);

  const expl = document.createElement("div");
  expl.className = "result-line";
  expl.innerHTML = `
    <span>Gora min ${fmt(gMin)}; K ${fmt(K)} (= 10/N, per gora point per opponent)</span>
    <span>+ receives, - pays</span>
  `;
  out.appendChild(expl);

  // Podium (sorted by score desc)
  const sorted = Object.entries(final)
    .map(([name, val]) => ({ name, val }))
    .sort((a, b) => (b.val - a.val) || a.name.localeCompare(b.name));

  podium.className = "section podium";
  const visualOrderRanks = sorted.length === 3 ? [2, 1, 3] : [2, 1, 3, 4];
  visualOrderRanks.forEach(rank => {
    const item = sorted[rank - 1];
    if (!item) return;

    const card = document.createElement("div");
    card.className = "podium-item";
    card.dataset.rank = String(rank);
    card.innerHTML = `
      <div class="podium-rank">#${rank}</div>
      <div class="podium-name">${item.name}</div>
      <div class="podium-score ${item.val >= 0 ? "plus" : "minus"}">
        ${item.val >= 0 ? "+" : ""}${fmt(item.val)}
      </div>
      <div class="podium-step"></div>
    `;
    podium.appendChild(card);
  });

  Object.entries(final).forEach(([name, val]) => {
    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${name}</span>
      <span class="${val >= 0 ? "plus" : "minus"}">
        ${val >= 0 ? "+" : ""}${fmt(val)}
      </span>
    `;
    out.appendChild(row);
  });

  addGameToHistory({
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    ts: new Date().toISOString(),
    pulya: app.pulya,
    N,
    gMin,
    K,
    players: app.players.map(p => ({ name: p.name, gora: p.gora, vists: { ...p.vists } })),
    final: { ...final },
  });

  show("screen-final");
}

// Ensure inline `onclick="..."` handlers always resolve even in stricter environments.
Object.assign(window, {
  show,
  startGame,
  savePlayerAndNext,
  calculateFinal,
  openHistory,
  clearHistory,
  setPlayerCount,
  addPlayer,
  removeLastPlayer,
  setHistoryTab,
});
