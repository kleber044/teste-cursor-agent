import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA_RADIUS,
  cameraRelativeWish,
  clampToArena,
  forwardFromYaw,
  inMeleeArc,
  yawFromDirection,
} from '../src/combat.js';
import { createMatch, restartMatch, step } from '../src/simulation.js';

const idle = { wishX: 0, wishZ: 0, attack: false, dodge: false };

test('camera-relative movement faces away from the camera', () => {
  const forward = cameraRelativeWish(0, 0, 1);
  const right = cameraRelativeWish(0, 1, 0);
  assert.ok(Math.abs(forward.x) < 1e-6);
  assert.ok(Math.abs(forward.z + 1) < 1e-6);
  assert.ok(Math.abs(right.x - 1) < 1e-6);
  assert.ok(Math.abs(right.z) < 1e-6);
  assert.ok(Math.abs(yawFromDirection(forward.x, forward.z)) < 1e-6);
  const facing = forwardFromYaw(0);
  assert.ok(Math.abs(facing.z + 1) < 1e-6);
});

test('melee arc hits targets in front and misses targets behind', () => {
  const attacker = { x: 0, z: 0, yaw: 0 };
  assert.equal(inMeleeArc(attacker, { x: 0, z: -1.4 }, 2.8, Math.PI * 0.9), true);
  assert.equal(inMeleeArc(attacker, { x: 0, z: 1.4 }, 2.8, Math.PI * 0.9), false);
  assert.equal(inMeleeArc(attacker, { x: 0, z: -4 }, 2.8, Math.PI), false);
});

test('arena clamp keeps bodies inside the circle', () => {
  const body = { x: 40, z: -20 };
  clampToArena(body);
  assert.ok(Math.hypot(body.x, body.z) <= ARENA_RADIUS + 1e-6);
});

test('player attack damages an enemy in front and respects cooldown', () => {
  const state = createMatch();
  state.phase = 'play';
  state.enemies[1].hp = 0;
  const brute = state.enemies[0];
  brute.x = state.player.x;
  brute.z = state.player.z - 1.4;
  brute.speed = 0;
  brute.aggro = 0;
  const before = brute.hp;
  step(state, { ...idle, attack: true }, 0.05);
  for (let i = 0; i < 4; i += 1) step(state, { ...idle, attack: true }, 0.05);
  assert.equal(brute.hp, before - state.player.damage);
  const afterFirst = brute.hp;
  step(state, { ...idle, attack: true }, 0.05);
  assert.equal(brute.hp, afterFirst);
});

test('player attack misses an enemy behind', () => {
  const state = createMatch();
  state.phase = 'play';
  state.enemies[1].hp = 0;
  const brute = state.enemies[0];
  brute.x = state.player.x;
  brute.z = state.player.z + 1.6;
  brute.speed = 0;
  brute.aggro = 0;
  const before = brute.hp;
  for (let i = 0; i < 8; i += 1) step(state, { wishX: 0, wishZ: -1, attack: true, dodge: false }, 0.05);
  assert.equal(brute.hp, before);
});

test('enemies pursue and the player can fell them', () => {
  const state = createMatch();
  state.phase = 'play';
  const start = Math.hypot(state.enemies[0].x - state.player.x, state.enemies[0].z - state.player.z);
  for (let i = 0; i < 20; i += 1) step(state, idle, 0.05);
  const closer = Math.hypot(state.enemies[0].x - state.player.x, state.enemies[0].z - state.player.z);
  assert.ok(closer < start - 0.4);

  let hurt = 0;
  for (let i = 0; i < 220; i += 1) {
    const events = step(state, { ...idle, attack: true }, 0.05);
    hurt += events.filter((event) => event.type === 'enemy-hurt').length;
    if (state.phase === 'victory' || state.phase === 'dead') break;
  }
  assert.ok(hurt >= 2);
  assert.ok(state.enemies.some((enemy) => enemy.hp < enemy.maxHp));
});

test('enemy windup damages the player', () => {
  const state = createMatch();
  state.phase = 'play';
  state.enemies[1].hp = 0;
  const brute = state.enemies[0];
  brute.x = state.player.x;
  brute.z = state.player.z - 1.2;
  brute.nextAttack = 0;
  brute.speed = 0;
  const before = state.player.hp;
  for (let i = 0; i < 30; i += 1) step(state, idle, 0.05);
  assert.ok(state.player.hp < before);
});

test('dodge grants invulnerability through an enemy impact', () => {
  const state = createMatch();
  state.phase = 'play';
  state.enemies[1].hp = 0;
  const brute = state.enemies[0];
  brute.x = 0;
  brute.z = -1.1;
  brute.nextAttack = 0;
  brute.attackRange = 12;
  brute.speed = 0;
  for (let i = 0; i < 6; i += 1) step(state, idle, 0.05);
  const hp = state.player.hp;
  step(state, { wishX: 0, wishZ: -1, attack: false, dodge: true }, 0.05);
  for (let i = 0; i < 20; i += 1) step(state, idle, 0.05);
  assert.equal(state.player.hp, hp);
  assert.ok(Math.hypot(state.player.x, state.player.z - 2.4) > 0.4);
});

test('lethal damage ends the match and restart restores it', () => {
  const state = createMatch();
  state.phase = 'play';
  state.enemies[1].hp = 0;
  const brute = state.enemies[0];
  brute.x = state.player.x;
  brute.z = state.player.z - 1.1;
  brute.nextAttack = 0;
  brute.damage = 100;
  brute.speed = 0;
  let died = false;
  for (let i = 0; i < 30; i += 1) {
    const events = step(state, idle, 0.05);
    died = died || events.some((event) => event.type === 'player-dead');
  }
  assert.equal(died, true);
  assert.equal(state.phase, 'dead');
  assert.equal(state.player.hp, 0);

  const next = restartMatch();
  assert.equal(next.phase, 'play');
  assert.equal(next.player.hp, 100);
  assert.equal(next.enemies[0].hp, next.enemies[0].maxHp);
  assert.equal(next.enemies[1].hp, next.enemies[1].maxHp);
});

test('defeating both hunters is a victory', () => {
  const state = createMatch();
  state.phase = 'play';
  for (const enemy of state.enemies) {
    enemy.hp = 22;
    enemy.x = state.player.x;
    enemy.z = state.player.z - 1.3;
    enemy.speed = 0;
    enemy.aggro = 0;
    enemy.nextAttack = 10;
  }
  let victory = false;
  for (let i = 0; i < 20; i += 1) {
    const events = step(state, { ...idle, attack: true }, 0.05);
    victory = victory || events.some((event) => event.type === 'victory');
  }
  assert.equal(victory, true);
  assert.equal(state.phase, 'victory');
  assert.ok(state.enemies.every((enemy) => enemy.hp <= 0));
});
