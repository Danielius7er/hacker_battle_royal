export const BOARD_SIZE = 19;
export const MAX_ROUNDS = 3;
export const ROUND_TICKS = 18;

export const FIGHTERS = [
  {
    id: "angry-computer",
    name: "Angry Computer",
    symbol: "A",
    hp: 10,
    attack: 3,
    attackRange: 2,
    defense: 0,
    speed: 2,
    specialName: "Firewall Burst",
    specialCooldown: 4,
    flavor: "High burst damage and strong counter-hacks."
  },
  {
    id: "mad-cell-phone",
    name: "Mad Cell-Phone",
    symbol: "C",
    hp: 7,
    attack: 2,
    attackRange: 2,
    defense: 0,
    speed: 3,
    specialName: "Signal Jump",
    specialCooldown: 3,
    flavor: "Fast and slippery, with sharp escape tools."
  },
  {
    id: "supa-tablet",
    name: "Supa Tablet",
    symbol: "T",
    hp: 12,
    attack: 2,
    attackRange: 1,
    defense: 1,
    speed: 1,
    specialName: "Shield Wall",
    specialCooldown: 5,
    flavor: "The tank of the apocalypse."
  },
  {
    id: "medley-printer",
    name: "Medley Printer",
    symbol: "P",
    hp: 8,
    attack: 2,
    attackRange: 2,
    defense: 0,
    speed: 2,
    specialName: "Toner Storm",
    specialCooldown: 4,
    flavor: "Area denial and close-range pressure."
  }
];

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

const SHIELD_AMOUNT = {
  "supa-tablet": 2
};

function keyToDirection(key) {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

function normalizeDirection(input) {
  if (input === "up" || input === "down" || input === "left" || input === "right") {
    return input;
  }
  return keyToDirection(input);
}

function cloneCell(cell) {
  return cell ? { ...cell } : null;
}

function cloneFighter(fighter) {
  return { ...fighter };
}

function cloneFighters(fighters) {
  return fighters.map(cloneFighter);
}

function sameCell(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInsideBoard(x, y, boardSize) {
  return x >= 0 && y >= 0 && x < boardSize && y < boardSize;
}

function safeRadiusForTick(boardSize, tick) {
  const maximum = Math.floor(boardSize / 2);
  const shrinkStep = Math.floor(tick / 10);
  return Math.max(4, maximum - shrinkStep);
}

function isInsideSafeZone(cell, boardSize, tick) {
  const center = Math.floor(boardSize / 2);
  const radius = safeRadiusForTick(boardSize, tick);
  return Math.abs(cell.x - center) <= radius && Math.abs(cell.y - center) <= radius;
}

function getRoundTick(state) {
  return state.roundTick ?? state.tick ?? 0;
}

function getSpawnPoints(boardSize) {
  const inset = 4;
  return [
    { x: inset, y: inset },
    { x: boardSize - inset - 1, y: inset },
    { x: inset, y: boardSize - inset - 1 },
    { x: boardSize - inset - 1, y: boardSize - inset - 1 }
  ];
}

function placeFighters(random) {
  const spawns = getSpawnPoints(BOARD_SIZE);
  return FIGHTERS.map((fighter, index) => {
    const spawn = spawns[index];
    const wobbleX = random() < 0.5 ? 0 : 1;
    const wobbleY = random() < 0.5 ? 0 : 1;
    const x = Math.min(BOARD_SIZE - 1, spawn.x + wobbleX);
    const y = Math.min(BOARD_SIZE - 1, spawn.y + wobbleY);
    return {
      ...fighter,
      x,
      y,
      hp: fighter.hp,
      maxHp: fighter.hp,
      shield: 0,
      cooldown: 0,
      alive: true,
      score: 0,
      kills: 0,
      isPlayer: false
    };
  });
}

function resetFightersForRound(state, random = state.random || Math.random) {
  const freshPositions = placeFighters(random);
  return freshPositions.map((fighter) => {
    const previous = state.fighters.find((entry) => entry.id === fighter.id) || fighter;
    return {
      ...fighter,
      score: previous.score || 0,
      kills: previous.kills || 0,
      isPlayer: previous.isPlayer
    };
  });
}

function awardRoundPoints(fighters, amount = 2) {
  fighters.forEach((fighter) => {
    if (fighter.alive) {
      fighter.score = (fighter.score || 0) + amount;
    }
  });
}

function summarizeWinners(fighters) {
  return [...fighters].sort((a, b) => {
    const scoreDelta = (b.score || 0) - (a.score || 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    if (a.alive !== b.alive) {
      return a.alive ? -1 : 1;
    }
    const hpDelta = (b.hp || 0) - (a.hp || 0);
    if (hpDelta !== 0) {
      return hpDelta;
    }
    return a.name.localeCompare(b.name);
  });
}

function buildWinnerSummary(fighters) {
  return summarizeWinners(fighters).slice(0, 4).map((fighter) => ({
    id: fighter.id,
    name: fighter.name,
    score: fighter.score || 0,
    alive: fighter.alive,
    hp: fighter.hp,
    kills: fighter.kills || 0
  }));
}

export function spawnLoot(fighters, boardSize, random = Math.random, tick = 0) {
  const occupied = fighters.filter((fighter) => fighter.alive);
  const openCells = [];
  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const blocked = occupied.some((fighter) => fighter.x === x && fighter.y === y);
      if (!blocked && isInsideSafeZone({ x, y }, boardSize, tick)) {
        openCells.push({ x, y });
      }
    }
  }

  if (openCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * openCells.length);
  return { ...openCells[index], amount: 2 };
}

export function createGame(random = Math.random, controlledId = "angry-computer", mode = "play") {
  const fighters = placeFighters(random).map((fighter) => ({
    ...fighter,
    isPlayer: fighter.id === controlledId
  }));

  return {
    boardSize: BOARD_SIZE,
    fighters,
    controlledId,
    queuedDirection: null,
    lastAction: "Choose a champion and enter the arena.",
    loot: spawnLoot(fighters, BOARD_SIZE, random, 0),
    tick: 0,
    round: 1,
    roundTick: 0,
    roundLimit: ROUND_TICKS,
    maxRounds: MAX_ROUNDS,
    hazardRadius: safeRadiusForTick(BOARD_SIZE, 0),
    random,
    mode,
    status: "ready",
    gameOver: false,
    winnerId: null,
    winnerName: null,
    winnerScore: null,
    winnerSummary: null,
    effect: { type: "start" }
  };
}

export function setControlledFighter(state, fighterId) {
  const fighters = cloneFighters(state.fighters).map((fighter) => ({
    ...fighter,
    isPlayer: fighter.id === fighterId
  }));

  return {
    ...state,
    fighters,
    controlledId: fighterId,
    queuedDirection: null,
    lastAction: `You are now controlling ${fighters.find((fighter) => fighter.id === fighterId)?.name || "a fighter"}.`,
    effect: { type: "select", fighterId }
  };
}

export function applyDirection(state, input, fighterId = state.controlledId) {
  const next = normalizeDirection(input);
  if (!next || state.gameOver || state.mode === "spectate") {
    return state;
  }

  const fighters = cloneFighters(state.fighters);
  const controlled = fighters.find((fighter) => fighter.id === fighterId && fighter.alive);
  if (!controlled) {
    return state;
  }

  const current = state.queuedDirection || next;
  if (OPPOSITES[current] === next) {
    return state;
  }

  return {
    ...state,
    fighters,
    queuedDirection: next,
    status: state.status === "ready" ? "playing" : state.status,
    lastAction: `${controlled.name} is moving ${next}.`,
    effect: { type: "move", fighterId, direction: next }
  };
}

function damageFighter(target, amount) {
  const damage = Math.max(1, amount - (target.defense || 0));
  const effectiveDamage = Math.max(1, damage - (target.shield || 0));
  target.shield = Math.max(0, (target.shield || 0) - damage);
  target.hp -= effectiveDamage;
  if (target.hp <= 0) {
    target.alive = false;
  }
  return effectiveDamage;
}

function chooseEnemy(actor, fighters) {
  return (
    fighters
      .filter((fighter) => fighter.alive && fighter.id !== actor.id)
      .sort((a, b) => manhattan(actor, a) - manhattan(actor, b) || a.hp - b.hp)[0] || null
  );
}

function occupiedCell(fighters, x, y, ignoreId = null) {
  return fighters.some((fighter) => fighter.alive && fighter.id !== ignoreId && fighter.x === x && fighter.y === y);
}

function findAttackTarget(actor, fighters) {
  const range = actor.attackRange || 1;
  return (
    fighters
      .filter((fighter) => fighter.alive && fighter.id !== actor.id)
      .filter((enemy) => {
        const dx = Math.abs(actor.x - enemy.x);
        const dy = Math.abs(actor.y - enemy.y);
        return (dx === 0 || dy === 0) && dx + dy <= range;
      })
      .sort((a, b) => manhattan(actor, a) - manhattan(actor, b) || a.hp - b.hp)[0] || null
  );
}

function chooseMove(actor, enemy, state) {
  if (!enemy) {
    return null;
  }

  const options = [
    { direction: "left", x: actor.x - 1, y: actor.y },
    { direction: "right", x: actor.x + 1, y: actor.y },
    { direction: "up", x: actor.x, y: actor.y - 1 },
    { direction: "down", x: actor.x, y: actor.y + 1 }
  ]
    .filter((option) => isInsideBoard(option.x, option.y, state.boardSize))
    .map((option) => ({
      ...option,
      dist: manhattan({ x: option.x, y: option.y }, enemy),
      safeBonus: isInsideSafeZone(option, state.boardSize, getRoundTick(state)) ? 0 : 2
    }))
    .sort((a, b) => a.dist + a.safeBonus - (b.dist + b.safeBonus));

  return options[0] || null;
}

function resolveCombat(actor, fighters, lastActionRef) {
  const target = findAttackTarget(actor, fighters);

  if (!target) {
    return null;
  }

  const distance = manhattan(actor, target);
  const damage = damageFighter(target, Math.max(1, actor.attack - (distance > 1 ? 1 : 0)));
  lastActionRef.value = `${actor.name} struck ${target.name} from ${distance} tile${distance === 1 ? "" : "s"} away for ${damage} damage.`;
  if (!target.alive) {
    actor.kills = (actor.kills || 0) + 1;
    actor.score = (actor.score || 0) + 5;
  } else {
    actor.score = (actor.score || 0) + 2;
  }
  return { type: "hit", attackerId: actor.id, targetId: target.id };
}

function maybeCollectLoot(actor, loot) {
  if (!loot || !sameCell(actor, loot)) {
    return { loot, effect: null };
  }

  actor.hp = Math.min(actor.maxHp, actor.hp + loot.amount);
  return { loot: null, effect: { type: "loot", fighterId: actor.id } };
}

function shouldUseSpecial(actor, enemy) {
  if (actor.cooldown > 0) {
    return false;
  }

  if (actor.id === "angry-computer") {
    return Boolean(enemy && manhattan(actor, enemy) <= 3);
  }

  if (actor.id === "mad-cell-phone") {
    return actor.hp <= 4 || Boolean(enemy && manhattan(actor, enemy) <= 3);
  }

  if (actor.id === "supa-tablet") {
    return actor.hp <= actor.maxHp - 2 || Boolean(enemy && manhattan(actor, enemy) <= 2);
  }

  if (actor.id === "medley-printer") {
    return Boolean(enemy && manhattan(actor, enemy) <= 2);
  }

  return false;
}

function useEnemySpecial(actor, fighters, state) {
  const nextState = {
    ...state,
    fighters: cloneFighters(fighters),
    controlledId: actor.id
  };
  return useSpecial(nextState, actor.id);
}

function finalizeRound(state, fighters, nextTick, nextRoundTick, lastActionRef, loot) {
  awardRoundPoints(fighters, 2);
  const alive = fighters.filter((fighter) => fighter.alive);
  if (alive.length === 1) {
    alive[0].score = (alive[0].score || 0) + 3;
    lastActionRef.value = `${alive[0].name} secured the round by elimination.`;
  } else {
    lastActionRef.value = `Round ${state.round} complete. Scores were tallied.`;
  }

  const ordered = summarizeWinners(fighters);
  const leader = ordered[0];
  const nextRound = state.round + 1;

  if (nextRound <= state.maxRounds) {
    const carriedFighters = resetFightersForRound(
      {
        ...state,
        fighters,
        random: state.random
      },
      state.random
    );

    return {
      ...state,
      fighters: carriedFighters,
      loot: spawnLoot(carriedFighters, state.boardSize, state.random, 0),
      tick: nextTick,
      round: nextRound,
      roundTick: 0,
      hazardRadius: safeRadiusForTick(state.boardSize, 0),
      queuedDirection: null,
      mode: state.mode,
      status: "playing",
      gameOver: false,
      winnerId: null,
      winnerName: null,
      winnerScore: null,
      winnerSummary: null,
      lastAction: `${lastActionRef.value} ${leader.name} leads with ${leader.score || 0} points.`,
      effect: { type: "restart", round: nextRound }
    };
  }

  const winnerSummary = buildWinnerSummary(fighters);
  return {
    ...state,
    fighters,
    loot,
    tick: nextTick,
    round: state.round,
    roundTick: nextRoundTick,
    hazardRadius: safeRadiusForTick(state.boardSize, nextRoundTick),
    queuedDirection: null,
    mode: state.mode,
    status: "won",
    gameOver: true,
    winnerId: leader?.id || null,
    winnerName: leader?.name || null,
    winnerScore: leader?.score || 0,
    winnerSummary,
    lastAction: `${leader?.name || "No one"} wins the tournament with ${leader?.score || 0} points.`,
    effect: { type: "win", winnerId: leader?.id || null, winnerScore: leader?.score || 0 }
  };
}

export function restartGame(
  state,
  random = state.random || Math.random,
  controlledId = state.controlledId || "angry-computer",
  mode = state.mode || "play"
) {
  return {
    ...createGame(random, controlledId, mode),
    effect: { type: "restart" }
  };
}

export function useSpecial(state, fighterId = state.controlledId) {
  if (state.gameOver) {
    return state;
  }

  const fighters = cloneFighters(state.fighters);
  const actor = fighters.find((fighter) => fighter.id === fighterId && fighter.alive);
  if (!actor || actor.cooldown > 0) {
    return state;
  }

  const enemies = fighters.filter((fighter) => fighter.alive && fighter.id !== actor.id);
  let lastAction = `${actor.name} used ${actor.specialName}.`;
  let effect = { type: "special", fighterId, specialName: actor.specialName };

  if (actor.id === "angry-computer") {
    const target = enemies
      .filter((enemy) => manhattan(actor, enemy) <= 3)
      .sort((a, b) => manhattan(actor, a) - manhattan(actor, b))[0];
    if (target) {
      damageFighter(target, 3);
      lastAction = `${actor.name} blasted ${target.name} with a firewall burst.`;
      effect = { type: "hit", fighterId, targetId: target.id };
    } else {
      actor.hp = Math.min(actor.maxHp, actor.hp + 1);
      lastAction = `${actor.name} overclocked and recovered 1 HP.`;
    }
  } else if (actor.id === "mad-cell-phone") {
    const threat = enemies
      .filter((enemy) => manhattan(actor, enemy) <= 3)
      .sort((a, b) => manhattan(actor, a) - manhattan(actor, b))[0];
    if (threat) {
      const awayX = Math.sign(actor.x - threat.x);
      const awayY = Math.sign(actor.y - threat.y);
      const candidates = [
        { x: actor.x + awayX, y: actor.y + awayY },
        { x: actor.x + awayX, y: actor.y },
        { x: actor.x, y: actor.y + awayY }
      ].filter((cell) => isInsideBoard(cell.x, cell.y, state.boardSize));
      const targetCell = candidates.find(
        (cell) => !fighters.some((fighter) => fighter.alive && fighter.x === cell.x && fighter.y === cell.y)
      );
      if (targetCell) {
        actor.x = targetCell.x;
        actor.y = targetCell.y;
        lastAction = `${actor.name} jitter-jumped out of danger.`;
      }
    } else {
      actor.hp = Math.min(actor.maxHp, actor.hp + 1);
      lastAction = `${actor.name} recharged 1 HP.`;
    }
  } else if (actor.id === "supa-tablet") {
    actor.hp = Math.min(actor.maxHp, actor.hp + 3);
    actor.shield += SHIELD_AMOUNT[actor.id] || 2;
    lastAction = `${actor.name} raised a shield wall.`;
  } else if (actor.id === "medley-printer") {
    const targets = enemies.filter((enemy) => manhattan(actor, enemy) <= 1);
    if (targets.length === 0) {
      actor.hp = Math.min(actor.maxHp, actor.hp + 1);
      lastAction = `${actor.name} refreshed its toner drum.`;
    } else {
      targets.forEach((target) => damageFighter(target, 2));
      lastAction = `${actor.name} sprayed toner across nearby enemies.`;
      effect = { type: "hit", fighterId };
    }
  }

  actor.cooldown = actor.specialCooldown;

  return {
    ...state,
    fighters,
    status: state.status === "ready" ? "playing" : state.status,
    lastAction,
    effect
  };
}

export function stepGame(state) {
  if (state.gameOver) {
    return state;
  }

  const fighters = cloneFighters(state.fighters);
  const nextTick = state.tick + 1;
  const nextRoundTick = state.roundTick + 1;
  const nextRadius = safeRadiusForTick(state.boardSize, nextRoundTick);
  const turnOrder = fighters
    .filter((fighter) => fighter.alive)
    .sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name));
  const lastActionRef = { value: state.lastAction };
  let effect = null;
  let loot = state.loot ? cloneCell(state.loot) : null;

  for (const fighter of turnOrder) {
    if (!fighter.alive) {
      continue;
    }

    if (fighter.cooldown > 0) {
      fighter.cooldown -= 1;
    }

    const enemy = chooseEnemy(fighter, fighters);
    if (shouldUseSpecial(fighter, enemy)) {
      const specialState = useEnemySpecial(fighter, fighters, {
        ...state,
        fighters,
        loot,
        tick: nextTick,
        roundTick: nextRoundTick
      });
      fighters.splice(0, fighters.length, ...cloneFighters(specialState.fighters));
      loot = specialState.loot ? cloneCell(specialState.loot) : loot;
      lastActionRef.value = specialState.lastAction;
      effect = specialState.effect || effect;
    }

    const controlledDirection = fighter.id === state.controlledId ? state.queuedDirection : null;
    const desiredDirection =
      fighter.id === state.controlledId && controlledDirection
        ? controlledDirection
        : enemy
          ? chooseMove(fighter, enemy, {
              ...state,
              fighters,
              roundTick: nextRoundTick,
              tick: nextTick
            })?.direction || null
          : null;

    if (desiredDirection) {
      const vector = DIRECTIONS[desiredDirection];
      const nextX = fighter.x + vector.x;
      const nextY = fighter.y + vector.y;
      if (isInsideBoard(nextX, nextY, state.boardSize) && !occupiedCell(fighters, nextX, nextY, fighter.id)) {
        fighter.x = nextX;
        fighter.y = nextY;
      }
    }

    const lootResult = maybeCollectLoot(fighter, loot);
    loot = lootResult.loot;
    effect = lootResult.effect || effect;

    const combatEffect = resolveCombat(fighter, fighters, lastActionRef);
    effect = combatEffect || effect;
  }

  fighters.forEach((fighter) => {
    if (!fighter.alive) {
      return;
    }

    if (!isInsideSafeZone(fighter, state.boardSize, nextRoundTick)) {
      damageFighter(fighter, 1);
      lastActionRef.value = `${fighter.name} took corruption damage outside the safe zone.`;
      effect = effect || { type: "damage", fighterId: fighter.id };
    }
  });

  const alive = fighters.filter((fighter) => fighter.alive);
  const roundEnded = alive.length <= 1 || nextRoundTick >= state.roundLimit;

  if (roundEnded) {
    return finalizeRound(state, fighters, nextTick, nextRoundTick, lastActionRef, loot);
  }

  return {
    ...state,
    fighters,
    loot,
    tick: nextTick,
    round: state.round,
    roundTick: nextRoundTick,
    roundLimit: state.roundLimit,
    maxRounds: state.maxRounds,
    hazardRadius: nextRadius,
    queuedDirection: null,
    mode: state.mode,
    status: "playing",
    gameOver: false,
    winnerId: null,
    winnerName: null,
    winnerScore: null,
    winnerSummary: null,
    lastAction: lastActionRef.value,
    effect
  };
}

export function toCellIndex(x, y, boardSize) {
  return y * boardSize + x;
}

export function getFighterAt(index, state) {
  const x = index % state.boardSize;
  const y = Math.floor(index / state.boardSize);
  return state.fighters.find((fighter) => fighter.alive && fighter.x === x && fighter.y === y) || null;
}

export function getCellClass(index, state) {
  const x = index % state.boardSize;
  const y = Math.floor(index / state.boardSize);
  const classes = ["cell", (x + y) % 2 === 0 ? "" : "alt"];
  const roundTick = getRoundTick(state);

  if (!isInsideSafeZone({ x, y }, state.boardSize, roundTick)) {
    classes.push("hazard");
  }

  if (state.loot && state.loot.x === x && state.loot.y === y) {
    classes.push("loot");
  }

  const fighter = getFighterAt(index, state);
  if (fighter) {
    classes.push("fighter", `fighter-${fighter.id}`);
    if (fighter.id === state.controlledId) {
      classes.push("controlled");
    }
  }

  return classes.filter(Boolean).join(" ");
}

export function getCellToken(index, state) {
  const fighter = getFighterAt(index, state);
  if (fighter) {
    return fighter.symbol;
  }

  if (state.loot) {
    const x = index % state.boardSize;
    const y = Math.floor(index / state.boardSize);
    if (state.loot.x === x && state.loot.y === y) {
      return "+";
    }
  }

  return isInsideSafeZone(
    { x: index % state.boardSize, y: Math.floor(index / state.boardSize) },
    state.boardSize,
    getRoundTick(state)
  )
    ? ""
    : "!";
}

export function getFighterSummary(state) {
  return state.fighters.map((fighter) => ({
    id: fighter.id,
    name: fighter.name,
    hp: fighter.hp,
    maxHp: fighter.maxHp,
    cooldown: fighter.cooldown,
    alive: fighter.alive,
    isPlayer: fighter.isPlayer,
    specialName: fighter.specialName,
    flavor: fighter.flavor,
    score: fighter.score || 0,
    kills: fighter.kills || 0
  }));
}
