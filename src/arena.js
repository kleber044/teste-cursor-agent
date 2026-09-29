import * as THREE from 'three';
import { ARENA_RADIUS } from './combat.js';

function mulberry32(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintDisc(mode) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const glow = mode === 'glow';
  ctx.clearRect(0, 0, 1024, 1024);
  if (!glow) {
    const wash = ctx.createRadialGradient(512, 512, 40, 512, 512, 520);
    wash.addColorStop(0, '#243049');
    wash.addColorStop(0.48, '#182033');
    wash.addColorStop(1, '#0c1018');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 2;
    for (let i = -16; i <= 16; i += 1) {
      ctx.beginPath();
      ctx.moveTo(512 + i * 32, 0);
      ctx.lineTo(512 + i * 32, 1024);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 512 + i * 32);
      ctx.lineTo(1024, 512 + i * 32);
      ctx.stroke();
    }
    const rng = mulberry32(7);
    for (let i = 0; i < 1800; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.045})`;
      ctx.fillRect(rng() * 1024, rng() * 1024, 2, 2);
    }
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1024, 1024);
  }

  const rings = [
    { r: 168, color: glow ? '#ffb15a' : 'rgba(255, 190, 110, 0.95)', width: 8 },
    { r: 250, color: glow ? '#7ef0ff' : 'rgba(126, 240, 255, 0.75)', width: 4 },
    { r: 390, color: glow ? '#e7c48a' : 'rgba(231, 196, 138, 0.55)', width: 3 },
  ];
  for (const ring of rings) {
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(512, 512, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = glow ? '#ffb15a' : 'rgba(255, 186, 96, 0.8)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(512 + Math.cos(angle) * 150, 512 + Math.sin(angle) * 150);
    ctx.lineTo(512 + Math.cos(angle) * 188, 512 + Math.sin(angle) * 188);
    ctx.stroke();
  }

  ctx.fillStyle = glow ? '#fff1cf' : 'rgba(255, 236, 196, 0.9)';
  ctx.beginPath();
  ctx.arc(512, 512, 46, 0.4, Math.PI * 1.7);
  ctx.arc(534, 512, 34, Math.PI * 1.7, 0.4, true);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createArena(scene, renderer) {
  const group = new THREE.Group();
  scene.add(group);

  const colorMap = paintDisc('color');
  const glowMap = paintDisc('glow');
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  colorMap.anisotropy = anisotropy;
  glowMap.anisotropy = anisotropy;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(22, 80),
    new THREE.MeshStandardMaterial({
      map: colorMap,
      emissive: new THREE.Color('#ffbf74'),
      emissiveMap: glowMap,
      emissiveIntensity: 0.55,
      roughness: 0.84,
      metalness: 0.16,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_RADIUS, 0.16, 10, 90),
    new THREE.MeshStandardMaterial({
      color: '#e0b56a',
      emissive: '#8a5a16',
      emissiveIntensity: 0.35,
      metalness: 0.72,
      roughness: 0.28,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  rim.castShadow = true;
  group.add(rim);

  const spinner = new THREE.Group();
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.045, 8, 64),
    new THREE.MeshBasicMaterial({ color: '#9cf7ff' }),
  );
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.06;
  spinner.add(inner);
  group.add(spinner);

  const stone = new THREE.MeshStandardMaterial({
    color: '#3c465c',
    roughness: 0.78,
    metalness: 0.22,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#ffd2a8',
    emissive: '#ff8a3c',
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.4,
  });
  const lights = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.2;
    const radius = 15.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 2.5, 6), stone);
    pillar.position.set(x, 1.25, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.22, 8), stone);
    bowl.position.set(x, 2.55, z);
    const flame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      i % 2 === 0 ? crystalMat : crystalMat.clone(),
    );
    if (i % 2 === 1) {
      flame.material.emissive = new THREE.Color('#49d7ff');
      flame.material.color = new THREE.Color('#d7f7ff');
    }
    flame.position.set(x, 2.9, z);
    const light = new THREE.PointLight(i % 2 === 0 ? 0xff8b3e : 0x73e2ff, 7.5, 12, 2);
    light.position.set(x, 2.9, z);
    group.add(pillar, bowl, flame, light);
    lights.push({ light, flame, phase: i });
  }

  const rng = mulberry32(21);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#222838', roughness: 0.9, metalness: 0.08 });
  for (let i = 0; i < 9; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 18.5 + rng() * 2.4;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + rng() * 0.8, 0), rockMat);
    rock.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
    rock.rotation.set(rng(), rng(), rng());
    rock.scale.y = 0.7 + rng() * 0.6;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 32;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#070914');
  skyGrad.addColorStop(0.42, '#17182c');
  skyGrad.addColorStop(0.72, '#3a2a3e');
  skyGrad.addColorStop(1, '#1a120e');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 32, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false }),
  );
  scene.add(sky);

  const starPositions = new Float32Array(180 * 3);
  const starRng = mulberry32(99);
  for (let i = 0; i < 180; i += 1) {
    const theta = starRng() * Math.PI * 2;
    const phi = Math.acos(1 - starRng() * 1.15);
    const radius = 62;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.75 + 8;
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.BufferGeometry();
  stars.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(
    stars,
    new THREE.PointsMaterial({ color: 0xf7f1e4, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false }),
  ));

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3.1, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xf6f1e6 }),
  );
  moon.position.set(-26, 24, -16);
  scene.add(moon);

  const emberCount = 64;
  const emberPositions = new Float32Array(emberCount * 3);
  const embers = [];
  const emberRng = mulberry32(4);
  for (let i = 0; i < emberCount; i += 1) {
    const ember = {
      x: (emberRng() - 0.5) * 24,
      z: (emberRng() - 0.5) * 24,
      y: emberRng() * 3.5,
      speed: 0.25 + emberRng() * 0.7,
    };
    embers.push(ember);
    emberPositions[i * 3] = ember.x;
    emberPositions[i * 3 + 1] = ember.y;
    emberPositions[i * 3 + 2] = ember.z;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  group.add(new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({ color: 0xffb15a, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false }),
  ));

  return {
    tick(time) {
      spinner.rotation.y = time * 0.22;
      for (const entry of lights) {
        const flicker = 6.4 + Math.sin(time * 7 + entry.phase) * 0.8 + Math.sin(time * 17 + entry.phase) * 0.35;
        entry.light.intensity = flicker;
        entry.flame.scale.setScalar(0.9 + Math.sin(time * 9 + entry.phase) * 0.12);
      }
      const attr = emberGeo.attributes.position;
      for (let i = 0; i < embers.length; i += 1) {
        embers[i].y += embers[i].speed * 0.016;
        if (embers[i].y > 4.2) embers[i].y = 0.1;
        attr.setY(i, embers[i].y);
      }
      attr.needsUpdate = true;
    },
  };
}
