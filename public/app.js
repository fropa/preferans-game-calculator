const app = {
  players: [],
  currentPlayerIndex: 0,
};

/* ---------- helpers ---------- */

function qs(id) {
  return document.getElementById(id);
}

function show(id) {
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.add("hidden"));
  qs(id).classList.remove("hidden");
}

/* ---------- setup ---------- */

function startGame() {
  const inputs = [
    qs("player-name-0"),
    qs("player-name-1"),
    qs("player-name-2"),
    qs("player-name-3"),
  ];

  const names = inputs
    .map(i => i.value.trim())
    .filter(n => n.length > 0);

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
    pool: 0,
    mountain: 0,
    whists: {},
  }));

  // init whists relations
  app.players.forEach(p => {
    app.players.forEach(o => {
      if (p.name !== o.name) {
        p.whists[o.name] = 0;
      }
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

  qs("pool-input").value = player.pool;
  qs("mountain-input").value = player.mountain;

  const whistsContainer = qs("whists-container");
  whistsContainer.innerHTML = "";

  Object.keys(player.whists).forEach(target => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>Whists paid TO ${target}</label>
      <input type="number" min="0" value="${player.whists[target]}"
        oninput="updateWhist('${target}', this.value)">
    `;
    whistsContainer.appendChild(div);
  });
}

function updateWhist(target, value) {
  app.players[app.currentPlayerIndex].whists[target] = Number(value) || 0;
}

function savePlayerAndNext() {
  const player = app.players[app.currentPlayerIndex];
  player.pool = Number(qs("pool-input").value) || 0;
  player.mountain = Number(qs("mountain-input").value) || 0;

  app.currentPlayerIndex++;

  if (app.currentPlayerIndex < app.players.length) {
    renderPlayerInput();
  } else {
    renderReview();
    show("screen-review");
  }
}

/* ---------- review ---------- */

function renderReview() {
  const container = qs("review-list");
  container.innerHTML = "";

  app.players.forEach(p => {
    const whistsSum = Object.values(p.whists).reduce((a, b) => a + b, 0);

    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${p.name}</span>
      <span>Pool ${p.pool}, Mountain ${p.mountain}, Whists ${whistsSum}</span>
    `;
    container.appendChild(row);
  });
}

/* ---------- final (placeholder) ---------- */

function calculateFinal() {
  const container = qs("final-results");
  container.innerHTML = "";

  app.players.forEach(p => {
    const whistsSum = Object.values(p.whists).reduce((a, b) => a + b, 0);
    const total = p.pool - p.mountain + whistsSum; // TEMP logic

    const row = document.createElement("div");
    row.className = "result-line";
    row.innerHTML = `
      <span>${p.name}</span>
      <span class="${total >= 0 ? "plus" : "minus"}">
        ${total >= 0 ? "+" : ""}${total}
      </span>
    `;
    container.appendChild(row);
  });

  show("screen-final");
}

