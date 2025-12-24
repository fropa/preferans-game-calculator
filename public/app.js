const app = {
  players: [],
  currentPlayerIndex: 0,
  pulya: 0, // GLOBAL ONLY
};

/* helpers */
function qs(id) {
  return document.getElementById(id);
}

function show(id) {
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.add("hidden")
  );
  qs(id).classList.remove("hidden");
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2);
}

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

  app.pulya = P;

  app.players = names.map(name => ({
    name,
    gora: 0,
    vists: {},
  }));

  // init vists matrix
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
    div.innerHTML = `
      <label>${p.name} → ${target}</label>
      <input type="number" value="${p.vists[target]}"
        oninput="updateVist('${target}', this.value)">
    `;
    c.appendChild(div);
  });
}

function updateVist(target, value) {
  app.players[app.currentPlayerIndex].vists[target] = num(value);
}

function savePlayerAndNext() {
  app.players[app.currentPlayerIndex].gora =
    num(qs("gora-input").value);

  app.currentPlayerIndex++;

  if (app.currentPlayerIndex < app.players.length) {
    renderInput();
  } else {
    renderReview();
    show("screen-review");
  }
}

/* review — Pulya shown ONCE */
function renderReview() {
  const c = qs("review-list");
  c.innerHTML = "";

  const header = document.createElement("div");
  header.className = "result-line";
  header.innerHTML = `
    <strong>Pulya</strong>
    <strong>${fmt(app.pulya)}</strong>
  `;
  c.appendChild(header);

  app.players.forEach(p => {
    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${p.name}</span>
      <span>Gora ${fmt(p.gora)}</span>
    `;
    c.appendChild(row);
  });
}

/* FINAL — Georgian rules */
function calculateFinal() {
  const out = qs("final-results");
  out.innerHTML = "";

  const N = app.players.length;
  const K = (N === 3) ? 2.5 : 3;

  const gMin = Math.min(...app.players.map(p => p.gora));

  const penalty = {};
  app.players.forEach(p => {
    penalty[p.name] = (p.gora - gMin) * K;
  });

  // clone vists
  const V = {};
  app.players.forEach(p => {
    V[p.name] = { ...p.vists };
  });

  // add penalties
  app.players.forEach(X => {
    const px = penalty[X.name];
    if (px === 0) return;

    app.players.forEach(Y => {
      if (Y.name !== X.name) {
        V[Y.name][X.name] += px;
      }
    });
  });

  // netting
  const final = {};
  app.players.forEach(p => final[p.name] = 0);

  for (let i = 0; i < app.players.length; i++) {
    for (let j = i + 1; j < app.players.length; j++) {
      const A = app.players[i].name;
      const B = app.players[j].name;

      const net = (V[A][B] || 0) - (V[B][A] || 0);
      final[A] += net;
      final[B] -= net;
    }
  }

  // Pulya context — ONCE
  const info = document.createElement("div");
  info.className = "result-line";
  info.innerHTML = `
    <strong>Pulya</strong>
    <strong>${fmt(app.pulya)}</strong>
  `;
  out.appendChild(info);

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
