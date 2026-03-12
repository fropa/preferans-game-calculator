const app = {
  players: [],
  currentPlayerIndex: 0,
  pulya: 0, // GLOBAL ONLY
};

const STORAGE_KEY_SETUP = "preferans:setup:v1";

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
    };
    localStorage.setItem(STORAGE_KEY_SETUP, JSON.stringify(data));
  } catch {
    // Ignore storage errors (private mode, quota, etc).
  }
}

document.addEventListener("DOMContentLoaded", () => {
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

  const names = [
    qs("player-name-0").value.trim(),
    qs("player-name-1").value.trim(),
    qs("player-name-2").value.trim(),
    qs("player-name-3").value.trim(),
  ].filter(Boolean);

  if (names.length < 3 || names.length > 4) {
    alert("3 or 4 players required");
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

  show("screen-final");
}
