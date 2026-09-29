import {
  ARENA_RADIUS,
  clampToArena,
  forwardFromYaw,
  inMeleeArc,
  resolveCircle,
  separationOffset,
  yawFromDirection,
} from './combat.js';

export const PLAYER_ATTACK_DELAY = 0.14;
export const PLAYER_ATTACK_DURATION = 0.34;
export const PLAYER_ATTACK_COOLDOWN = 0.52;
export const DODGE_DURATION = 0.28;
export const DODGE_COOLDOWN = 0.82;
export const DODGE_SPEED = 14;
export const ENEMY_WINDUP = 0.48;
export const ENEMY_RECOVER = 0.9;

function makeEnemy(config) {
  return {
    hp: config.maxHp,
    maxHp: config.maxHp,
    yaw: yawFromDirection(config.faceX, config.faceZ),
    nextAttack: config.nextAttack,
    impactAt: 0,
    recoverUntil: 0,
    didImpact: false,
    invulnUntil: 0,
    hurtUntil: 0,
    moving: false,
    aggro: 30,
    ...config,
  };
}

export function createMatch() {
  return {
    phase: 'menu',
    time: 0,
    player: {
      x: 0,
      z: 2.4,
      yaw: 0,
      hp: 100,
      maxHp: 100,
      speed: 6.5,
      damage: 22,
      range: 2.85,
      arc: Math.PI * 0.92,
      attackReady: 0,
      attackStart: 0,
      attackEnds: 0,
      attacking: false,
      attackHit: false,
      attackYaw: 0,
      dodgeEnds: 0,
      dodgeReady: 0,
      dodgeX: 0,
      dodgeZ: -1,
      invulnUntil: 0,
      hurtUntil: 0,
      moving: false,
    },
    enemies: [
      makeEnemy({
        id: 'brute',
        name: 'Bruto',
        variant: 'brute',
        x: -5.2,
        z: -4.4,
        faceX: 5.2,
        faceZ: 6.8,
        maxHp: 66,
        speed: 3.35,
        damage: 14,
        attackRange: 2.15,
        nextAttack: 0.7,
        slot: -1,
        color: '#ff5d45',
      }),
      makeEnemy({
        id: 'stalker',
        name: 'Espreitador',
        variant: 'stalker',
        x: 5.6,
        z: -5.2,
        faceX: -5.6,
        faceZ: 7.6,
        maxHp: 44,
        speed: 4.45,
        damage: 11,
        attackRange: 1.95,
        nextAttack: 1.15,
        slot: 1,
        color: '#d7a6ff',
      }),
    ],
  };
}

export function restartMatch() {
  const match = createMatch();
  match.phase = 'play';
  return match;
}

function nearestLiving(state) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const dist = Math.hypot(enemy.x - state.player.x, enemy.z - state.player.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function moveEnemy(enemy, player, living, now, stepDt) {
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const dist = Math.hypot(dx, dz) || 0.0001;
  const inWindup = enemy.impactAt > 0 && now < enemy.impactAt;

  if (dist <= enemy.aggro) enemy.yaw = yawFromDirection(dx, dz);

  if (inWindup || dist > enemy.aggro || dist <= enemy.attackRange * 0.92) {
    enemy.moving = false;
    return;
  }

  let mx = dx / dist;
  let mz = dz / dist;
  mx += (-dz / dist) * enemy.slot * 0.22;
  mz += (dx / dist) * enemy.slot * 0.22;
  const sep = separationOffset(enemy, living.filter((other) => other !== enemy), 1.5);
  mx += sep.x * 1.5;
  mz += sep.z * 1.5;
  const length = Math.hypot(mx, mz) || 1;
  enemy.x += (mx / length) * enemy.speed * stepDt;
  enemy.z += (mz / length) * enemy.speed * stepDt;
  enemy.moving = true;
  enemy.yaw = yawFromDirection(player.x - enemy.x, player.z - enemy.z);
}

export function step(state, input, dt) {
  const events = [];
  if (state.phase !== 'play') return events;

  const stepDt = Math.min(Math.max(dt, 0), 0.05);
  state.time += stepDt;
  const now = state.time;
  const player = state.player;

  const wishX = input.wishX || 0;
  const wishZ = input.wishZ || 0;
  const wishLen = Math.hypot(wishX, wishZ);
  const nx = wishLen > 1 ? wishX / wishLen : wishX;
  const nz = wishLen > 1 ? wishZ / wishLen : wishZ;

  if (input.dodge && now >= player.dodgeReady && now >= player.dodgeEnds) {
    if (wishLen > 0.15) {
      player.dodgeX = nx;
      player.dodgeZ = nz;
    } else {
      const facing = forwardFromYaw(player.yaw);
      player.dodgeX = facing.x;
      player.dodgeZ = facing.z;
    }
    player.dodgeEnds = now + DODGE_DURATION;
    player.dodgeReady = now + DODGE_COOLDOWN;
    player.invulnUntil = Math.max(player.invulnUntil, player.dodgeEnds);
    player.attacking = false;
    player.attackHit = true;
    events.push({ type: 'dodge' });
  }

  const dodging = now < player.dodgeEnds;
  if (!dodging && input.attack && !player.attacking && now >= player.attackReady) {
    if (wishLen < 0.2) {
      const nearest = nearestLiving(state);
      if (nearest) {
        player.yaw = yawFromDirection(nearest.x - player.x, nearest.z - player.z);
      }
    }
    player.attacking = true;
    player.attackHit = false;
    player.attackStart = now;
    player.attackEnds = now + PLAYER_ATTACK_DURATION;
    player.attackReady = now + PLAYER_ATTACK_COOLDOWN;
    player.attackYaw = player.yaw;
    const facing = forwardFromYaw(player.yaw);
    player.x += facing.x * 0.38;
    player.z += facing.z * 0.38;
    events.push({ type: 'player-attack' });
  }

  if (dodging) {
    player.x += player.dodgeX * DODGE_SPEED * stepDt;
    player.z += player.dodgeZ * DODGE_SPEED * stepDt;
    player.moving = true;
    player.yaw = yawFromDirection(player.dodgeX, player.dodgeZ);
  } else if (wishLen > 0.12) {
    const speed = player.attacking ? player.speed * 0.42 : player.speed;
    player.x += nx * speed * stepDt;
    player.z += nz * speed * stepDt;
    player.moving = true;
    if (!player.attacking) player.yaw = yawFromDirection(nx, nz);
  } else {
    player.moving = false;
  }

  const living = () => state.enemies.filter((enemy) => enemy.hp > 0);

  for (const enemy of living()) {
    moveEnemy(enemy, player, living(), now, stepDt);
  }

  if (player.attacking && !player.attackHit && now >= player.attackStart + PLAYER_ATTACK_DELAY) {
    player.attackHit = true;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || now < enemy.invulnUntil) continue;
      if (!inMeleeArc(
        { x: player.x, z: player.z, yaw: player.attackYaw },
        enemy,
        player.range,
        player.arc,
      )) continue;
      enemy.hp = Math.max(0, enemy.hp - player.damage);
      enemy.invulnUntil = now + 0.16;
      enemy.hurtUntil = now + 0.18;
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      const dist = Math.hypot(dx, dz) || 1;
      enemy.x += (dx / dist) * 0.42;
      enemy.z += (dz / dist) * 0.42;
      events.push({ type: 'enemy-hurt', id: enemy.id, amount: player.damage, hp: enemy.hp });
      if (enemy.hp <= 0) events.push({ type: 'enemy-dead', id: enemy.id });
    }
    if (state.phase === 'play' && state.enemies.every((enemy) => enemy.hp <= 0)) {
      state.phase = 'victory';
      events.push({ type: 'victory' });
    }
  }

  if (player.attacking && now >= player.attackEnds) player.attacking = false;

  if (state.phase === 'play') {
    for (const enemy of living()) {
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const inSwing = enemy.impactAt > 0 && now < enemy.recoverUntil;
      if (!inSwing && now >= enemy.nextAttack && dist <= enemy.attackRange + 0.28) {
        enemy.impactAt = now + ENEMY_WINDUP;
        enemy.recoverUntil = now + ENEMY_RECOVER;
        enemy.nextAttack = now + 1.55;
        enemy.didImpact = false;
        events.push({ type: 'enemy-windup', id: enemy.id });
      }
      if (enemy.impactAt > 0 && !enemy.didImpact && now >= enemy.impactAt) {
        enemy.didImpact = true;
        const hitDist = Math.hypot(player.x - enemy.x, player.z - enemy.z);
        if (hitDist <= enemy.attackRange + 0.62) {
          if (now < player.invulnUntil) {
            events.push({ type: 'dodged', id: enemy.id });
          } else {
            player.hp = Math.max(0, player.hp - enemy.damage);
            player.invulnUntil = now + 0.48;
            player.hurtUntil = now + 0.22;
            player.x += (dx / dist) * 0.5;
            player.z += (dz / dist) * 0.5;
            events.push({ type: 'player-hurt', id: enemy.id, amount: enemy.damage, hp: player.hp });
            if (player.hp <= 0) {
              state.phase = 'dead';
              player.attacking = false;
              player.moving = false;
              events.push({ type: 'player-dead' });
              break;
            }
          }
        }
      }
    }
  }

  for (const enemy of living()) {
    if (enemy.hp > 0) resolveCircle(player, enemy, 0.98);
  }
  const alive = living();
  if (alive.length >= 2) resolveCircle(alive[0], alive[1], 1.3);
  clampToArena(player);
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) clampToArena(enemy, ARENA_RADIUS);
  }

  return events;
}
