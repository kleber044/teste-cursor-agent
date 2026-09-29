import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createArena } from './arena.js';
import { createFighter, syncFighter } from './actors.js';
import { createAudio } from './audio.js';
import { cameraRelativeWish } from './combat.js';
import {
  DODGE_COOLDOWN,
  ENEMY_RECOVER,
  ENEMY_WINDUP,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_ATTACK_DURATION,
  createMatch,
  restartMatch,
  step,
} from './simulation.js';

export function mountGame(root) {
  const canvas = root.querySelector('#view');
  const overlay = root.querySelector('#overlay');
  const overlayTitle = root.querySelector('#overlay-title');
  const overlayCopy = root.querySelector('#overlay-copy');
  const overlayAction = root.querySelector('#overlay-action');
  const status = root.querySelector('#status');
  const hpText = root.querySelector('#hp-text');
  const hpFill = root.querySelector('#hp-fill');
  const attackChip = root.querySelector('#attack-chip');
  const dodgeChip = root.querySelector('#dodge-chip');
  const floats = root.querySelector('#floats');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#100e18');
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 180);
  const arena = createArena(scene, renderer);

  scene.add(new THREE.HemisphereLight(0xb7c9ff, 0x3a2418, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 46;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.00025;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x6d8cff, 0.7);
  rim.position.set(10, 6, 14);
  scene.add(rim);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.4, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let state = createMatch();
  const audio = createAudio();
  const playerActor = createFighter('player');
  const enemyActors = state.enemies.map((enemy) => {
    const actor = createFighter(enemy.variant);
    const plate = createNameplate(enemy.name, enemy.color);
    scene.add(actor.root, actor.shadow, plate.sprite);
    return { actor, plate, enemyId: enemy.id };
  });
  scene.add(playerActor.root, playerActor.shadow);

  const keys = new Set();
  let cameraYaw = 0.2;
  let cameraHeight = 4.8;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let attackHeld = false;
  let shake = 0;
  let visualTime = 0;
  let lastFrame = performance.now();
  const project = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const activeFloats = [];

  function showOverlay(mode) {
    overlay.hidden = false;
    if (mode === 'menu') {
      overlayTitle.textContent = 'Arena do Eclipse';
      overlayCopy.textContent = 'Dois caçadores patrulham o círculo de pedra. Persiga, ataque e esquive. Se a sua luz apagar, recomece.';
      overlayAction.textContent = 'Entrar na arena';
      return;
    }
    if (mode === 'dead') {
      overlayTitle.textContent = 'A luz se apagou';
      overlayCopy.textContent = `Os caçadores venceram em ${state.time.toFixed(1)}s. Esquive o golpe telegráfico no chão e tente de novo.`;
      overlayAction.textContent = 'Tentar de novo';
      return;
    }
    overlayTitle.textContent = 'Eclipse rompido';
    overlayCopy.textContent = `Bruto e Espreitador caíram em ${state.time.toFixed(1)}s. O círculo é seu — até a próxima luta.`;
    overlayAction.textContent = 'Jogar novamente';
  }

  function hideOverlay() {
    overlay.hidden = true;
    canvas.focus();
  }

  function startFromMenu() {
    state.phase = 'play';
    state.time = 0;
    hideOverlay();
  }

  function restart() {
    state = restartMatch();
    shake = 0;
    hideOverlay();
  }

  function onPrimary() {
    audio.unlock();
    if (state.phase === 'menu') startFromMenu();
    else if (state.phase === 'dead' || state.phase === 'victory') restart();
  }

  overlayAction.addEventListener('click', onPrimary);
  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    if (event.code === 'Enter') onPrimary();
    if (event.code === 'KeyR') {
      audio.unlock();
      if (state.phase === 'menu') startFromMenu();
      else restart();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    attackHeld = false;
    dragging = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    if (state.phase !== 'play') return;
    if (event.button === 2 || event.button === 1) {
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    }
    if (event.button === 0) attackHeld = true;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    cameraYaw -= (event.clientX - lastPointerX) * 0.005;
    cameraHeight = THREE.MathUtils.clamp(cameraHeight + (event.clientY - lastPointerY) * 0.012, 2.6, 8.2);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) attackHeld = false;
    if (event.button === 2 || event.button === 1) dragging = false;
  });

  function spawnFloat(text, x, z, className) {
    const el = document.createElement('div');
    el.className = `float ${className}`;
    el.textContent = text;
    floats.appendChild(el);
    activeFloats.push({ el, x, y: 1.9, z, age: 0 });
  }

  function playSound(fn) {
    try {
      fn();
    } catch (error) {
      console.warn(error);
    }
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event.type === 'player-attack') playSound(() => audio.attack());
      if (event.type === 'dodge') {
        playSound(() => audio.dodge());
        spawnFloat('Esquiva', state.player.x, state.player.z, 'dodge');
      }
      if (event.type === 'enemy-hurt') {
        playSound(() => audio.hit());
        shake = Math.min(0.7, shake + 0.18);
        const enemy = state.enemies.find((item) => item.id === event.id);
        spawnFloat(`-${event.amount}`, enemy.x, enemy.z, 'hit');
      }
      if (event.type === 'player-hurt') {
        playSound(() => audio.hurt());
        shake = Math.min(1, shake + 0.45);
        spawnFloat(`-${event.amount}`, state.player.x, state.player.z, 'hurt');
      }
      if (event.type === 'dodged') spawnFloat('Desvio', state.player.x, state.player.z, 'dodge');
      if (event.type === 'player-dead') {
        playSound(() => audio.die());
        showOverlay('dead');
      }
      if (event.type === 'victory') {
        playSound(() => audio.win());
        showOverlay('victory');
      }
    }
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloom.setSize(width, height);
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    visualTime += dt;

    if (state.phase === 'menu') cameraYaw += dt * 0.12;
    if (keys.has('KeyQ')) cameraYaw += dt * 1.7;
    if (keys.has('KeyE')) cameraYaw -= dt * 1.7;

    if (state.phase === 'play') {
      const moveX = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const moveZ = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const wish = cameraRelativeWish(cameraYaw, moveX, moveZ);
      const attack = attackHeld || keys.has('KeyJ') || keys.has('KeyK');
      const dodge = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight');
      handleEvents(step(state, { wishX: wish.x, wishZ: wish.z, attack, dodge }, dt));
    }

    const poseTime = state.phase === 'menu' ? visualTime : state.time;
    const playerDodge = state.time < state.player.dodgeEnds && state.phase === 'play';
    syncFighter(playerActor, state.player, {
      time: poseTime,
      moving: state.player.moving && state.phase === 'play',
      attackT: state.player.attacking
        ? THREE.MathUtils.clamp((state.time - state.player.attackStart) / PLAYER_ATTACK_DURATION, 0, 1)
        : 0,
      dodging: playerDodge,
      hurt: state.time < state.player.hurtUntil,
      windupT: 0,
    });

    state.enemies.forEach((enemy, index) => {
      const { actor, plate } = enemyActors[index];
      const swinging = enemy.impactAt > 0 && state.time < enemy.recoverUntil && enemy.hp > 0;
      const windupT = enemy.impactAt > 0 && state.time < enemy.impactAt
        ? THREE.MathUtils.clamp((state.time - (enemy.impactAt - ENEMY_WINDUP)) / ENEMY_WINDUP, 0, 1)
        : 0;
      syncFighter(actor, enemy, {
        time: poseTime,
        moving: enemy.moving && state.phase === 'play',
        attackT: swinging
          ? THREE.MathUtils.clamp((state.time - (enemy.impactAt - ENEMY_WINDUP)) / ENEMY_RECOVER, 0, 1)
          : 0,
        dodging: false,
        hurt: state.time < enemy.hurtUntil,
        windupT,
      });
      plate.update(enemy.hp, enemy.maxHp);
      plate.sprite.position.set(enemy.x, 2.55 * (enemy.variant === 'brute' ? 1.12 : 1), enemy.z);
    });

    arena.tick(visualTime);
    sun.position.set(state.player.x - 9, 16, state.player.z + 7);
    sun.target.position.set(state.player.x, 0, state.player.z);

    const dist = 8.4;
    desired.set(
      state.player.x + Math.sin(cameraYaw) * dist,
      cameraHeight,
      state.player.z + Math.cos(cameraYaw) * dist,
    );
    camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    look.set(state.player.x, 1.35, state.player.z);
    camera.lookAt(look);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.45;
      camera.position.y += (Math.random() - 0.5) * shake * 0.45;
      shake = Math.max(0, shake - dt * 1.7);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = activeFloats.length - 1; i >= 0; i -= 1) {
      const item = activeFloats[i];
      item.age += dt;
      item.y += dt * 0.9;
      project.set(item.x, item.y, item.z).project(camera);
      item.el.style.transform = `translate(${(project.x * 0.5 + 0.5) * width}px, ${(-project.y * 0.5 + 0.5) * height}px) translate(-50%, -50%)`;
      item.el.style.opacity = String(Math.max(0, 1 - item.age / 0.8));
      if (item.age > 0.8) {
        item.el.remove();
        activeFloats.splice(i, 1);
      }
    }

    const hpRatio = state.player.hp / state.player.maxHp;
    hpFill.style.width = `${Math.max(0, hpRatio) * 100}%`;
    hpText.textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
    root.classList.toggle('low', state.player.hp > 0 && hpRatio <= 0.3);
    root.classList.toggle('hurt', state.time < state.player.hurtUntil);
    const attackRatio = cooldownRatio(state.player.attackReady, PLAYER_ATTACK_COOLDOWN, state.time);
    const dodgeRatio = cooldownRatio(state.player.dodgeReady, DODGE_COOLDOWN, state.time);
    attackChip.style.setProperty('--p', attackRatio.toFixed(3));
    dodgeChip.style.setProperty('--p', dodgeRatio.toFixed(3));
    attackChip.classList.toggle('waiting', attackRatio < 0.98);
    dodgeChip.classList.toggle('waiting', dodgeRatio < 0.98);

    const alive = state.enemies.filter((enemy) => enemy.hp > 0);
    if (state.phase === 'victory') status.textContent = 'Os dois caçadores caíram';
    else if (state.phase === 'dead') status.textContent = 'Você caiu';
    else if (state.phase === 'menu') status.textContent = 'Bruto e Espreitador guardam o círculo';
    else status.textContent = alive.map((enemy) => `${enemy.name} ${Math.ceil(enemy.hp)}`).join('   ·   ') || 'Arena limpa';

    composer.render();
    requestAnimationFrame(frame);
  }

  showOverlay('menu');
  requestAnimationFrame(frame);
}

function cooldownRatio(readyAt, cooldown, time) {
  return THREE.MathUtils.clamp(1 - (readyAt - time) / cooldown, 0, 1);
}

function createNameplate(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.1, 0.58, 1);
  sprite.center.set(0.5, 0);

  function update(hp, maxHp) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 72);
    ctx.fillStyle = 'rgba(6, 8, 12, 0.72)';
    ctx.fillRect(18, 8, 220, 56);
    ctx.fillStyle = '#f6f0e6';
    ctx.font = '600 22px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(36, 44, 184, 10);
    ctx.fillStyle = color;
    ctx.fillRect(36, 44, 184 * Math.max(0, hp / maxHp), 10);
    texture.needsUpdate = true;
    sprite.visible = hp > 0;
  }

  update(1, 1);
  return { sprite, update };
}
