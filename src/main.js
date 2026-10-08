import {
  BOARD_SIZE,
  MAX_ROUNDS,
  FIGHTERS,
  applyDirection,
  createGame,
  getCellClass,
  getFighterSummary,
  restartGame,
  setControlledFighter,
  stepGame,
  useSpecial
} from "./game.js";
import { createSoundSystem } from "./audio.js";

const MINI_SIZE = 7;

const board = document.querySelector("#board");
const minimap = document.querySelector("#minimap");
const roster = document.querySelector("#roster");
const statusNode = document.querySelector("#status");
const modeNode = document.querySelector("#mode");
const restartButton = document.querySelector("#restart");
const newMatchButton = document.querySelector("#new-match");
const specialButton = document.querySelector("#special");
const muteButton = document.querySelector("#mute");
const controlledNode = document.querySelector("#controlled");
const roundNode = document.querySelector("#round");
const zoneNode = document.querySelector("#zone");
const survivorsNode = document.querySelector("#survivors");
const titleScreen = document.querySelector("#title-screen");
const startPlayButton = document.querySelector("#start-play");
const startSpectateButton = document.querySelector("#start-spectate");
const winnerScreen = document.querySelector("#winner-screen");
const winnerTitle = document.querySelector("#winner-title");
const winnerText = document.querySelector("#winner-text");
const winnerSummary = document.querySelector("#winner-summary");
const winnerRestartButton = document.querySelector("#winner-restart");
const winnerNewMatchButton = document.querySelector("#winner-new-match");
const controlButtons = document.querySelectorAll("[data-direction]");

const audio = createSoundSystem();
let state = createGame();
let timer = null;
const tickMs = 240;
let started = false;

board.style.setProperty("--size", String(BOARD_SIZE));

function ensureBoardCells() {
  if (board.dataset.initialized === "true") {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.dataset.index = String(i);

    const sprite = document.createElement("span");
    sprite.className = "sprite sprite-hidden";
    sprite.setAttribute("aria-hidden", "true");
    cell.appendChild(sprite);

    fragment.appendChild(cell);
  }
  board.replaceChildren(fragment);
  board.dataset.initialized = "true";
}

function ensureRosterCards() {
  if (roster.dataset.initialized === "true") {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const fighter of FIGHTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roster-card";
    button.dataset.fighter = fighter.id;
    button.setAttribute("aria-label", `Control ${fighter.name}`);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = fighter.symbol;
    button.appendChild(chip);

    const title = document.createElement("h3");
    title.textContent = fighter.name;
    button.appendChild(title);

    const flavor = document.createElement("p");
    flavor.className = "flavor";
    flavor.textContent = fighter.flavor;
    button.appendChild(flavor);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.dataset.meta = fighter.id;
    button.appendChild(meta);

    const meter = document.createElement("div");
    meter.className = "meter";
    const meterFill = document.createElement("span");
    meterFill.dataset.hp = fighter.id;
    meter.appendChild(meterFill);
    button.appendChild(meter);

    fragment.appendChild(button);
  }
  roster.replaceChildren(fragment);
  roster.dataset.initialized = "true";
}

function ensureMinimapCells() {
  if (minimap.dataset.initialized === "true") {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < MINI_SIZE * MINI_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "mini-cell";
    cell.dataset.index = String(i);
    fragment.appendChild(cell);
  }
  minimap.replaceChildren(fragment);
  minimap.dataset.initialized = "true";
}

function stopLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startLoop() {
  if (timer || state.gameOver || !started) {
    return;
  }

  timer = setInterval(() => {
    commit(stepGame(state));
    if (state.gameOver) {
      stopLoop();
    }
  }, tickMs);
}

function bodyMode(mode) {
  document.body.dataset.mode = mode;
}

function formatSafeZone() {
  const radius = state.hazardRadius;
  const fullRadius = Math.floor(BOARD_SIZE / 2);
  return radius === fullRadius ? "Full" : `Radius ${radius}`;
}

function setModeLabel(mode) {
  bodyMode(mode);
  modeNode.dataset.mode = mode;
  if (state.gameOver) {
    modeNode.textContent = "Tournament complete";
    return;
  }
  if (mode === "spectate") {
    modeNode.textContent = "Watch mode: AI controls all fighters";
    return;
  }
  if (state.status === "ready") {
    modeNode.textContent = "Play mode: you control one fighter";
    return;
  }
  modeNode.textContent = `Play mode: Round ${state.round} of ${MAX_ROUNDS}`;
}

function roundTickRatio() {
  return Math.max(0, Math.min(1, state.roundTick / state.roundLimit));
}

function miniCoord(value) {
  return Math.round((value / Math.max(1, BOARD_SIZE - 1)) * (MINI_SIZE - 1));
}

function getMiniIndex(x, y) {
  return y * MINI_SIZE + x;
}

function getMiniCellClass(miniX, miniY) {
  const boardX = Math.round((miniX / Math.max(1, MINI_SIZE - 1)) * (BOARD_SIZE - 1));
  const boardY = Math.round((miniY / Math.max(1, MINI_SIZE - 1)) * (BOARD_SIZE - 1));
  const fighter = state.fighters.find((entry) => entry.alive && entry.x === boardX && entry.y === boardY);
  const classes = ["mini-cell"];
  const safe = Math.abs(boardX - Math.floor(BOARD_SIZE / 2)) <= state.hazardRadius && Math.abs(boardY - Math.floor(BOARD_SIZE / 2)) <= state.hazardRadius;
  if (safe) {
    classes.push("safe");
  } else {
    classes.push("hazard");
  }
  if (state.loot && state.loot.x === boardX && state.loot.y === boardY) {
    classes.push("loot");
  }
  if (fighter) {
    classes.push("fighter", fighter.id);
  }
  return { classes, fighter, boardX, boardY };
}

function renderRoster() {
  ensureRosterCards();
  const summary = getFighterSummary(state);
  roster.querySelectorAll(".roster-card").forEach((card) => {
    const fighterId = card.dataset.fighter;
    const fighter = summary.find((entry) => entry.id === fighterId);
    if (!fighter) {
      return;
    }

    card.dataset.active = fighter.isPlayer ? "true" : "false";
    card.dataset.alive = fighter.alive ? "true" : "false";
    card.disabled = state.mode === "spectate";
    card.querySelector("h3").textContent = `${fighter.name}${fighter.alive ? "" : " - eliminated"}`;
    card.querySelector(".flavor").textContent = fighter.alive ? fighter.flavor : "Eliminated from the arena.";
    card.querySelector(`[data-meta="${fighter.id}"]`).textContent = `${fighter.score} pts | ${fighter.kills} KOs`;

    const meterFill = card.querySelector(`[data-hp="${fighter.id}"]`);
    const ratio = fighter.maxHp === 0 ? 0 : Math.max(0, fighter.hp) / fighter.maxHp;
    meterFill.style.width = `${Math.max(6, Math.round(ratio * 100))}%`;
    meterFill.style.background =
      fighter.id === "angry-computer"
        ? "linear-gradient(90deg, var(--computer), rgba(114, 226, 255, 0.35))"
        : fighter.id === "mad-cell-phone"
          ? "linear-gradient(90deg, var(--phone), rgba(255, 138, 107, 0.35))"
          : fighter.id === "supa-tablet"
            ? "linear-gradient(90deg, var(--tablet), rgba(168, 255, 138, 0.35))"
            : "linear-gradient(90deg, var(--printer), rgba(255, 211, 109, 0.35))";
  });
}

function renderBoard() {
  ensureBoardCells();
  board.querySelectorAll(".cell").forEach((cell, index) => {
    cell.className = getCellClass(index, state);
    const sprite = cell.firstElementChild;
    if (sprite) {
      const x = index % BOARD_SIZE;
      const y = Math.floor(index / BOARD_SIZE);
      const fighter = state.fighters.find((entry) => entry.alive && entry.x === x && entry.y === y);
      if (fighter) {
        sprite.className = `sprite sprite-${fighter.id} ${fighter.id === state.controlledId ? "sprite-controlled" : ""} visible`;
      } else if (state.loot && state.loot.x === x && state.loot.y === y) {
        sprite.className = "sprite sprite-loot visible";
      } else {
        sprite.className = "sprite sprite-hidden";
      }
    }

    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const fighter = state.fighters.find((entry) => entry.alive && entry.x === x && entry.y === y);
    const label = fighter ? fighter.name : state.loot && state.loot.x === x && state.loot.y === y ? "Data cache" : "Empty sector";
    cell.setAttribute("aria-label", `${label} at ${x}, ${y}`);
  });
}

function renderMinimap() {
  ensureMinimapCells();
  minimap.querySelectorAll(".mini-cell").forEach((cell, index) => {
    const miniY = Math.floor(index / MINI_SIZE);
    const miniX = index % MINI_SIZE;
    const { classes, fighter, boardX, boardY } = getMiniCellClass(miniX, miniY);
    cell.className = classes.join(" ");
    cell.textContent = fighter ? fighter.symbol : "";
    cell.title = fighter
      ? fighter.name
      : state.loot && state.loot.x === boardX && state.loot.y === boardY
        ? "Loot cache"
        : `Sector ${boardX}, ${boardY}`;
  });
}

function renderSummary() {
  const controlled = state.fighters.find((fighter) => fighter.id === state.controlledId);
  controlledNode.textContent = controlled ? `${controlled.name} (${controlled.score || 0} pts)` : "Unknown";
  roundNode.textContent = `Round ${state.round} / ${MAX_ROUNDS} | Tick ${state.roundTick}/${state.roundLimit}`;
  zoneNode.textContent = formatSafeZone();
  survivorsNode.textContent = String(state.fighters.filter((fighter) => fighter.alive).length);
}

function renderStatus() {
  if (state.gameOver) {
    statusNode.textContent = `${state.winnerName || "No one"} wins the tournament.`;
    setModeLabel("won");
    return;
  }

  if (state.mode === "spectate") {
    statusNode.textContent = `Watch mode active. ${state.lastAction || "The AI battles on its own."}`;
    setModeLabel("spectate");
    return;
  }

  if (state.status === "ready") {
    statusNode.textContent = "Choose a champion, then move or tap Hack to begin.";
    setModeLabel("ready");
    return;
  }

  statusNode.textContent = state.lastAction || "The fight continues.";
  setModeLabel("playing");
}

function renderSpecialButton() {
  const fighter = state.fighters.find((entry) => entry.id === state.controlledId);
  if (!fighter) {
    specialButton.disabled = true;
    specialButton.textContent = "Use special";
    return;
  }

  specialButton.disabled = state.gameOver || state.mode === "spectate" || fighter.cooldown > 0 || !fighter.alive;
  specialButton.textContent = fighter.cooldown > 0 ? `${fighter.specialName} (${fighter.cooldown})` : fighter.specialName;
}

function renderMuteButton() {
  muteButton.textContent = audio.enabled ? "Sound on" : "Sound off";
  muteButton.setAttribute("aria-pressed", String(!audio.enabled));
}

function renderControls() {
  const locked = state.gameOver || state.mode === "spectate";
  controlButtons.forEach((button) => {
    button.disabled = locked && button.dataset.direction !== "special";
  });
}

function renderWinnerScreen() {
  if (!state.gameOver) {
    winnerScreen.hidden = true;
    return;
  }

  winnerScreen.hidden = false;
  winnerTitle.textContent = `${state.winnerName || "No one"} wins`;
  winnerText.textContent = `Final score: ${state.winnerScore || 0} points after ${state.maxRounds} rounds.`;
  const summary = state.winnerSummary || [];
  winnerSummary.replaceChildren(
    ...summary.map((entry) => {
      const row = document.createElement("div");
      row.className = "winner-entry";
      row.textContent = `${entry.name}${entry.alive ? " (alive)" : ""}`;

      const score = document.createElement("strong");
      score.textContent = `${entry.score} pts | ${entry.kills} KOs`;
      row.appendChild(score);
      return row;
    })
  );
}

function render() {
  bodyMode(state.mode);
  renderRoster();
  renderBoard();
  renderMinimap();
  renderSummary();
  renderStatus();
  renderSpecialButton();
  renderMuteButton();
  renderControls();
  renderWinnerScreen();
}

function commit(nextState, { playSound = true } = {}) {
  state = nextState;
  if (playSound && state.effect) {
    audio.play(state.effect);
  }
  state = { ...state, effect: null };
  render();
}

function startMatch(mode) {
  started = true;
  titleScreen.hidden = true;
  winnerScreen.hidden = true;
  audio.unlock();
  commit(
    {
      ...createGame(state.random, state.controlledId, mode),
      effect: { type: "start" }
    },
    { playSound: true }
  );
  startLoop();
}

function restart() {
  if (!started) {
    return;
  }
  audio.unlock();
  commit(restartGame(state, state.random, state.controlledId, state.mode));
  winnerScreen.hidden = true;
  startLoop();
}

function chooseChampion(fighterId) {
  if (state.mode === "spectate") {
    return;
  }
  commit(setControlledFighter(state, fighterId), { playSound: false });
}

function handleMove(direction) {
  if (!started || state.mode === "spectate") {
    return;
  }
  commit(applyDirection(state, direction));
  startLoop();
}

function handleSpecial() {
  if (!started || state.mode === "spectate") {
    return;
  }
  commit(useSpecial(state));
  startLoop();
}

document.addEventListener("keydown", (event) => {
  if (!started) {
    if (event.key === "Enter") {
      startMatch("play");
    }
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    restart();
    return;
  }

  if (event.key === "Enter" && state.gameOver) {
    restart();
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    handleSpecial();
    return;
  }

  const nextState = applyDirection(state, event.key);
  if (nextState !== state) {
    commit(nextState);
    startLoop();
  }
});

restartButton.addEventListener("click", restart);
newMatchButton.addEventListener("click", restart);
winnerRestartButton.addEventListener("click", restart);
winnerNewMatchButton.addEventListener("click", () => startMatch("play"));
specialButton.addEventListener("click", handleSpecial);
muteButton.addEventListener("click", () => {
  audio.setEnabled(!audio.enabled);
  renderMuteButton();
});

startPlayButton.addEventListener("click", () => {
  startMatch("play");
});

startSpectateButton.addEventListener("click", () => {
  startMatch("spectate");
});

roster.addEventListener("click", (event) => {
  const button = event.target.closest("[data-fighter]");
  if (!button) {
    return;
  }
  chooseChampion(button.dataset.fighter);
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction;
    if (direction === "special") {
      handleSpecial();
      return;
    }
    if (direction) {
      handleMove(direction);
    }
  });
});

render();
titleScreen.hidden = false;
setModeLabel("ready");
board.setAttribute("aria-describedby", "status");
