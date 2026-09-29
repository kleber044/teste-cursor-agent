export const ARENA_RADIUS = 13.6;

export function yawFromDirection(x, z) {
  return Math.atan2(-x, -z);
}

export function forwardFromYaw(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function cameraRelativeWish(cameraYaw, inputX, inputZ) {
  const fx = -Math.sin(cameraYaw);
  const fz = -Math.cos(cameraYaw);
  const rx = Math.cos(cameraYaw);
  const rz = -Math.sin(cameraYaw);
  const x = fx * inputZ + rx * inputX;
  const z = fz * inputZ + rz * inputX;
  const length = Math.hypot(x, z);
  if (length < 1e-6) return { x: 0, z: 0 };
  return { x: x / length, z: z / length };
}

export function inMeleeArc(attacker, target, range, arcRadians) {
  const dx = target.x - attacker.x;
  const dz = target.z - attacker.z;
  const dist = Math.hypot(dx, dz);
  if (dist > range || dist < 1e-5) return false;
  const facing = forwardFromYaw(attacker.yaw);
  const dot = (facing.x * dx + facing.z * dz) / dist;
  return dot >= Math.cos(arcRadians / 2);
}

export function clampToArena(entity, radius = ARENA_RADIUS) {
  const dist = Math.hypot(entity.x, entity.z);
  if (dist > radius) {
    entity.x *= radius / dist;
    entity.z *= radius / dist;
  }
}

export function separationOffset(self, others, minDist) {
  let x = 0;
  let z = 0;
  for (const other of others) {
    const dx = self.x - other.x;
    const dz = self.z - other.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-4 && dist < minDist) {
      const push = (minDist - dist) / dist;
      x += dx * push;
      z += dz * push;
    }
  }
  return { x, z };
}

export function resolveCircle(a, b, minDist) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-5) {
    b.x += minDist;
    return;
  }
  if (dist >= minDist) return;
  const push = (minDist - dist) / 2;
  const nx = dx / dist;
  const nz = dz / dist;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
}
