import * as THREE from 'three';

const VARIANTS = {
  player: {
    scale: 1,
    body: '#9aabC8',
    cloth: '#1d2838',
    accent: '#8cf6ff',
    emissive: '#39d7ff',
    weapon: 'sword',
  },
  brute: {
    scale: 1.16,
    body: '#9a4038',
    cloth: '#2c1412',
    accent: '#ff6d4e',
    emissive: '#ff3a2a',
    weapon: 'club',
  },
  stalker: {
    scale: 0.94,
    body: '#74559a',
    cloth: '#1a1324',
    accent: '#e4c2ff',
    emissive: '#c084fc',
    weapon: 'spear',
  },
};

function paint(geometry, material, shadows = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

function addWeapon(variant, material) {
  const weapon = new THREE.Group();
  if (variant.weapon === 'club') {
    const handle = paint(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), material);
    handle.position.y = -0.2;
    const head = paint(new THREE.SphereGeometry(0.16, 12, 10), material);
    head.scale.set(1.1, 0.8, 1.1);
    head.position.y = -0.46;
    weapon.add(handle, head);
    return weapon;
  }
  if (variant.weapon === 'spear') {
    const shaft = paint(new THREE.CylinderGeometry(0.03, 0.035, 1.15, 8), material);
    shaft.position.y = -0.45;
    const tip = paint(new THREE.ConeGeometry(0.07, 0.28, 6), material);
    tip.position.y = -1.08;
    weapon.add(shaft, tip);
    return weapon;
  }
  const blade = paint(new THREE.BoxGeometry(0.055, 0.92, 0.018), material);
  blade.position.y = -0.5;
  const guard = paint(new THREE.BoxGeometry(0.24, 0.045, 0.06), material);
  guard.position.y = -0.08;
  weapon.add(blade, guard);
  return weapon;
}

export function createFighter(variantName) {
  const variant = VARIANTS[variantName];
  const root = new THREE.Group();
  root.scale.setScalar(variant.scale);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: variant.body,
    roughness: 0.42,
    metalness: 0.38,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: variant.cloth,
    roughness: 0.72,
    metalness: 0.18,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: variant.accent,
    emissive: variant.emissive,
    emissiveIntensity: 0.7,
    roughness: 0.28,
    metalness: 0.64,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: variant.emissive });

  const torso = paint(new THREE.CapsuleGeometry(0.3, 0.38, 6, 12), bodyMat);
  torso.position.y = 1.16;
  const hip = paint(new THREE.SphereGeometry(0.26, 16, 12), clothMat);
  hip.scale.set(1.15, 0.72, 0.95);
  hip.position.y = 0.82;
  const head = paint(new THREE.SphereGeometry(0.21, 18, 14), bodyMat);
  head.position.y = 1.72;
  const cloak = paint(new THREE.ConeGeometry(0.48, 0.95, 8, 1, true), clothMat);
  cloak.position.set(0, 1.02, 0.1);
  cloak.rotation.x = 0.18;

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), eyeMat);
  leftEye.position.set(-0.08, 1.74, -0.16);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.08;

  const shoulderGeo = new THREE.SphereGeometry(0.13, 12, 10);
  const leftShoulder = paint(shoulderGeo, accentMat);
  leftShoulder.position.set(-0.38, 1.42, 0);
  leftShoulder.scale.z = 0.75;
  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 0.38;

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.15, 0.78, 0);
  const legGeo = new THREE.CapsuleGeometry(0.09, 0.34, 4, 8);
  const leftLegMesh = paint(legGeo, clothMat);
  leftLegMesh.position.y = -0.32;
  leftLeg.add(leftLegMesh);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.15, 0.78, 0);
  const rightLegMesh = paint(legGeo, clothMat);
  rightLegMesh.position.y = -0.32;
  rightLeg.add(rightLegMesh);

  const armGeo = new THREE.CapsuleGeometry(0.075, 0.26, 4, 8);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.4, 1.36, 0);
  const leftArmMesh = paint(armGeo, bodyMat);
  leftArmMesh.position.y = -0.22;
  leftArm.add(leftArmMesh);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.4, 1.36, 0);
  const rightArmMesh = paint(armGeo, bodyMat);
  rightArmMesh.position.y = -0.22;
  const weapon = addWeapon(variant, accentMat);
  weapon.position.y = -0.46;
  rightArm.add(rightArmMesh, weapon);

  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.035, 6, 22, Math.PI * 1.05),
    new THREE.MeshBasicMaterial({
      color: variant.emissive,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  slash.position.set(0, 1.12, -0.72);
  slash.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.58, 40),
    new THREE.MeshBasicMaterial({
      color: variant.emissive,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.045;
  ring.visible = false;

  if (variantName === 'brute') {
    const horn = paint(new THREE.ConeGeometry(0.07, 0.34, 6), accentMat, false);
    horn.position.set(-0.12, 1.98, 0);
    horn.rotation.z = 0.45;
    const hornRight = horn.clone();
    hornRight.position.x = 0.12;
    hornRight.rotation.z = -0.45;
    root.add(horn, hornRight);
  }
  if (variantName === 'stalker') {
    const crest = paint(new THREE.ConeGeometry(0.05, 0.42, 5), accentMat, false);
    crest.position.set(0, 2.02, 0);
    root.add(crest);
  }
  if (variantName === 'player') {
    const visor = paint(new THREE.BoxGeometry(0.3, 0.07, 0.08), accentMat, false);
    visor.position.set(0, 1.74, -0.16);
    root.add(visor);
  }

  root.add(
    torso,
    hip,
    head,
    cloak,
    leftEye,
    rightEye,
    leftShoulder,
    rightShoulder,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    slash,
    ring,
  );

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.52 * variant.scale, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;

  return {
    root,
    shadow,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    slash,
    ring,
    bodyMat,
    accentMat,
    baseEmissive: 0.7,
  };
}

export function syncFighter(actor, entity, fx) {
  const dead = entity.hp <= 0;
  const bob = dead
    ? 0
    : (fx.moving ? Math.abs(Math.sin(fx.time * 11)) * 0.05 : Math.sin(fx.time * 2) * 0.015);
  actor.root.position.set(entity.x, bob, entity.z);
  actor.root.rotation.set(dead ? -1.15 : 0, entity.yaw, !dead && fx.dodging ? 0.28 : 0);
  actor.shadow.position.set(entity.x, 0.025, entity.z);
  actor.shadow.visible = !dead;

  const stride = Math.sin(fx.time * (fx.moving ? 11 : 2));
  const amp = dead ? 0 : (fx.moving ? 0.75 : 0.06);
  actor.leftLeg.rotation.x = stride * amp;
  actor.rightLeg.rotation.x = -stride * amp;
  actor.leftArm.rotation.x = -stride * amp * 0.45;
  actor.leftArm.rotation.z = 0.18;

  if (!dead && fx.attackT > 0) {
    const swing = Math.sin(Math.min(fx.attackT, 1) * Math.PI);
    actor.rightArm.rotation.x = -0.35 - swing * 1.55;
    actor.rightArm.rotation.z = -0.2 - swing * 0.35;
    actor.slash.visible = true;
    actor.slash.rotation.z = -1.15 + fx.attackT * 2.3;
    actor.slash.material.opacity = 0.15 + swing * 0.8;
  } else {
    actor.rightArm.rotation.x = stride * amp * 0.45;
    actor.rightArm.rotation.z = -0.18;
    actor.slash.visible = false;
  }

  const telegraph = !dead && fx.windupT > 0 && fx.windupT < 1;
  actor.ring.visible = telegraph;
  if (telegraph) {
    const scale = 0.65 + fx.windupT * 1.9;
    actor.ring.scale.setScalar(scale);
    actor.ring.material.opacity = 0.2 + fx.windupT * 0.65;
  }

  const hurt = !dead && fx.hurt;
  actor.bodyMat.emissive.set(hurt ? 0xfff4ea : 0x000000);
  actor.bodyMat.emissiveIntensity = hurt ? 0.45 : 0;
  actor.accentMat.emissiveIntensity = hurt ? 1.6 : (fx.dodging ? 1.35 : actor.baseEmissive);
}
