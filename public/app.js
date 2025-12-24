const app = {
  players: [],
  currentPlayerIndex: 0,
  K: 10, // price of pulya (your table)
};

/* ---------- helpers ---------- */

function qs(id) {
  return document.getElementById(id);
}

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  qs(id).classList.remove("hidden");
}

function toNumber(v) {
  // Allows empty -> 0, integers/decimals
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  // Pretty formatting: integers as int, others up to 2 decimals
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded.toFixed(2);
}

/* ---------- setup ---------- */

function startGame() {
  const inputs = [
    qs("player-name-0"),
    qs("player-name-1"),
    qs("player-name-2"),
    qs("player-name-3"),
  ];

  const names = inputs.map(i => i.value.trim()).filter(n => n.length > 0);

  if (names.length < 3) {
    alert("At least 3 players are required");
    return;
  }

  if (names.length > 4) {
    alert("Maximum 4 players allowed");
    return;
  }

  app.players = names.map(name => ({
    name,
    P: 0,           // Pulya
    G: 0,           // Gora
    payTo: {},      // payments: this player pays to others
  }));

  // init payment matrix (payTo) with zeros
  app.players.forEach(p => {
    app.players.forEach(o => {
      if (p.name !== o.name) p.payTo[o.name] = 0;
    });
  });

  app.currentPlayerIndex = 0;
  renderPlayerInput();
  show("screen-input");
}

/* ---------- player input ---------- */

function renderPlayerInput() {
  const player = app.players[app.currentPlayerIndex];
  qs("current-player-name").innerText = player.name;

  // Keep old DOM ids, but map them to P/G now
  qs("pool-input").value = player.P;
  qs("mountain-input").value = player.G;

  const container = qs("whists-container");
  container.innerHTML = "";

  Object.keys(player.payTo).forEach(target => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>Paid TO ${target}</label>
      <input type="number" value="${player.payTo[target]}"
        oninput="updatePayTo('${target}', this.value)">
    `;
    container.appendChild(div);
  });
}

function updatePayTo(target, value) {
  app.players[app.currentPlayerIndex].payTo[target] = toNumber(value);
}

function savePlayerAndNext() {
  const player = app.players[app.currentPlayerIndex];

  player.P = toNumber(qs("pool-input").value);
  player.G = toNumber(qs("mountain-input").value);

  app.currentPlayerIndex++;

  if (app.currentPlayerIndex < app.players.length) {
    renderPlayerInput();
  } else {
    renderReview();
    show("screen-review");
  }
}

/* ---------- calculations (based on your manual) ---------- */

// Compute net Vists V_i from pay matrix:
// V_i = received_from_others - paid_to_others
function computeNetVists() {
  const names = app.players.map(p => p.name);

  // Outgoing for i
  const paid = {};
  // Incoming for i
  const received = {};
  names.forEach(n => { paid[n] = 0; received[n] = 0; });

  app.players.forEach(p => {
    const from = p.name;
    Object.entries(p.payTo).forEach(([to, amt]) => {
      const a = toNumber(amt);
      paid[from] += a;
      received[to] += a;
    });
  });

  const V = {};
  names.forEach(n => {
    V[n] = received[n] - paid[n];
  });

  return V; // map name -> net V
}

function renderReview() {
  const container = qs("review-list");
  const warn = qs("review-warning");
  warn.classList.add("hidden");
  warn.innerText = "";

  container.innerHTML = "";

  const V = computeNetVists();

  app.players.forEach(p => {
    const v = V[p.name];
    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${p.name}</span>
      <span>P ${fmt(p.P)} · G ${fmt(p.G)} · V ${fmt(v)}</span>
    `;
    container.appendChild(row);
  });

  // Sanity check: sum(V)=0 (should hold if matrix used consistently)
  const sumV = Object.values(V).reduce((a, b) => a + b, 0);
  if (Math.abs(sumV) > 1e-9) {
    warn.classList.remove("hidden");
    warn.innerText = `⚠ Sanity check failed: sum(V) = ${fmt(sumV)} (should be 0)`;
  }
}

function calculateFinal() {
  const out = qs("final-results");
  const warn = qs("final-warning");
  warn.classList.add("hidden");
  warn.innerText = "";

  out.innerHTML = "";

  const n = app.players.length;
  const V = computeNetVists();

  // Step 2: average pulya
  const sumP = app.players.reduce((a, p) => a + toNumber(p.P), 0);
  const Pavg = sumP / n;

  // Step 3 + 4: PulyaPoints and Final
  const finals = [];
  app.players.forEach(p => {
    const PulyaPoints = (toNumber(p.P) - Pavg) * app.K;
    const Final = PulyaPoints - toNumber(p.G) + toNumber(V[p.name]);

    finals.push({ name: p.name, PulyaPoints, G: p.G, V: V[p.name], Final });
  });

  // Display: show Final only (keep UI simple)
  finals.forEach(r => {
    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${r.name}</span>
      <span class="${r.Final >= 0 ? "plus" : "minus"}">
        ${r.Final >= 0 ? "+" : ""}${fmt(r.Final)}
      </span>
    `;
    out.appendChild(row);
  });

  // Step 5 sanity check: sum(Final)=0
  const sumFinal = finals.reduce((a, r) => a + r.Final, 0);
  if (Math.abs(sumFinal) > 1e-6) {
    warn.classList.remove("hidden");
    warn.innerText =
      `⚠ Sanity check failed: sum(Final) = ${fmt(sumFinal)} (should be 0). Check P/G inputs, vists matrix, or K=${app.K}.`;
  }

  show("screen-final");
}
