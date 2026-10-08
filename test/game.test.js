import assert from "node:assert/strict";
import {
  BOARD_SIZE,
  MAX_ROUNDS,
  ROUND_TICKS,
  applyDirection,
  createGame,
  setControlledFighter,
  spawnLoot,
  stepGame,
  useSpecial
} from "../src/game.js";

function makeRandom(sequence) {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
}

const cases = [];

function test(name, fn) {
  cases.push({ name, fn });
}

test("creates four named fighters with a controllable champion", () => {
  const state = createGame(() => 0);

  assert.equal(state.boardSize, BOARD_SIZE);
  assert.equal(state.fighters.length, 4);
  assert.equal(state.fighters.filter((fighter) => fighter.isPlayer).length, 1);
  assert.equal(state.controlledId, "angry-computer");
});

test("direction input queues movement for the controlled fighter", () => {
  const state = createGame(() => 0);
  const next = applyDirection(state, "ArrowUp");

  assert.equal(next.queuedDirection, "up");
  assert.equal(next.status, "playing");
});

test("champion selection changes who is under player control", () => {
  const state = createGame(() => 0);
  const next = setControlledFighter(state, "medley-printer");

  assert.equal(next.controlledId, "medley-printer");
  assert.equal(next.fighters.find((fighter) => fighter.id === "medley-printer").isPlayer, true);
  assert.equal(next.fighters.find((fighter) => fighter.id === "angry-computer").isPlayer, false);
});

test("special moves have character-specific effects", () => {
  const state = createGame(() => 0);
  const boosted = useSpecial({
    ...state,
    fighters: state.fighters.map((fighter) => ({
      ...fighter,
      cooldown: 0
    }))
  }, "supa-tablet");

  const tablet = boosted.fighters.find((fighter) => fighter.id === "supa-tablet");
  assert.equal(tablet.hp, tablet.maxHp);
  assert.equal(tablet.shield > 0, true);
  assert.equal(tablet.cooldown, tablet.specialCooldown);
});

test("loot spawns only on open cells inside the safe zone", () => {
  const fighters = [
    { x: 2, y: 2, alive: true },
    { x: 3, y: 2, alive: true }
  ];

  const loot = spawnLoot(fighters, 5, makeRandom([0]), 0);

  assert.ok(loot);
  assert.equal(fighters.some((fighter) => fighter.x === loot.x && fighter.y === loot.y), false);
});

test("rounds advance and the final round produces a score winner", () => {
  let state = createGame(makeRandom([0, 0, 0, 0]));
  state = {
    ...state,
    round: MAX_ROUNDS,
    roundTick: ROUND_TICKS - 1,
    fighters: [
      {
        ...state.fighters[0],
        x: 5,
        y: 5,
        hp: 10,
        attack: 3,
        speed: 3,
        cooldown: 0,
        score: 7,
        kills: 1,
        isPlayer: true
      },
      {
        ...state.fighters[1],
        x: 6,
        y: 5,
        hp: 0,
        attack: 1,
        speed: 1,
        alive: false,
        score: 4,
        kills: 0
      },
      {
        ...state.fighters[2],
        x: 10,
        y: 10,
        hp: 0,
        attack: 1,
        speed: 1,
        alive: false,
        score: 3,
        kills: 0
      },
      {
        ...state.fighters[3],
        x: 12,
        y: 12,
        hp: 0,
        attack: 1,
        speed: 1,
        alive: false,
        score: 2,
        kills: 0
      }
    ],
    loot: null,
    controlledId: "angry-computer",
    queuedDirection: "right"
  };

  state = stepGame(state);

  assert.equal(state.gameOver, true);
  assert.equal(state.winnerName, "Angry Computer");
  assert.ok(state.winnerSummary.length > 0);
});

let failed = 0;
for (const { name, fn } of cases) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} test(s) failed.`);
} else {
  console.log(`\n${cases.length} test(s) passed.`);
}
