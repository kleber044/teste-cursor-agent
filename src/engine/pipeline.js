import {
  clamp01,
  hazeMask,
  lampMask,
  lerp,
  luma,
  protectColorMask,
  rgbToHsv,
  roadMask,
  satOf,
  skinMask,
  smoothstep,
  vegetationMask,
  withSat,
} from './color.js';
import { getProfile, loadCatalog, resolveProfileName } from './catalog.js';

const BLOOM_TAPS = [
  [0, 0], [1.2, 0.4], [-1.1, 0.5], [0.4, 1.3], [-0.5, -1.2],
  [2.1, 0.8], [-2.0, 0.7], [0.8, -2.1], [-0.9, 2.0],
  [2.6, -1.4], [-2.5, -1.5], [0.2, 2.7],
];

const CLEAR_TAPS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

function sample(data, w, h, x, y) {
  const sx = Math.max(0, Math.min(w - 1, x));
  const sy = Math.max(0, Math.min(h - 1, y));
  const i = (sy * w + sx) * 3;
  return [data[i], data[i + 1], data[i + 2]];
}

function write(out, i, rgb) {
  out[i] = rgb[0];
  out[i + 1] = rgb[1];
  out[i + 2] = rgb[2];
}

function mapPixels(image, fn) {
  const { width, height, data } = image;
  const out = new Float32Array(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      write(out, i, fn(data[i], data[i + 1], data[i + 2], x, y));
    }
  }
  return { width, height, data: out };
}

export function averageLuma(image) {
  const { data } = image;
  let sum = 0;
  const count = data.length / 3;
  for (let i = 0; i < data.length; i += 3) sum += luma(data[i], data[i + 1], data[i + 2]);
  return sum / count;
}

function scaleAroundLuma(r, g, b, nextLuma) {
  const y = luma(r, g, b);
  if (y < 1e-5) return [nextLuma, nextLuma, nextLuma];
  const scale = nextLuma / y;
  return [r * scale, g * scale, b * scale];
}

function exposure(r, g, b, bias) {
  const gain = 1 + bias;
  return [r * gain, g * gain, b * gain];
}

function highlightRecovery(r, g, b, start, strength) {
  const y = luma(r, g, b);
  if (y <= start) return [r, g, b];
  const t = (y - start) / (1 - start);
  const compressed = start + (1 - start) * (t / (1 + t * strength));
  return scaleAroundLuma(r, g, b, compressed);
}

function tonemap(r, g, b, strength) {
  const y = luma(r, g, b);
  if (y <= 0.84) return [r, g, b];
  const mapped = 0.84 + (y - 0.84) / (1 + (y - 0.84) * strength);
  return scaleAroundLuma(r, g, b, mapped);
}

function liftShadows(r, g, b, amount) {
  const y = luma(r, g, b);
  if (y >= 0.35 || amount <= 0) return [r, g, b];
  const lift = (1 - smoothstep(0.02, 0.35, y)) * amount;
  return [r + lift, g + lift, b + lift];
}

function applyLamps(r, g, b, strength) {
  const mask = lampMask(r, g, b) * strength;
  if (mask <= 0) return [r, g, b];
  const y = luma(r, g, b);
  return [lerp(r, y, mask), lerp(g, y, mask), lerp(b, y, mask)];
}

function applyColor(r, g, b, vibrance, vegCap) {
  const skin = skinMask(r, g, b);
  const protect = protectColorMask(r, g, b);
  if (skin > 0.45 || protect > 0.45 || vibrance === 1) return [r, g, b];
  const veg = vegetationMask(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  let next = hsv.s * vibrance;
  if (veg > 0.4) next = Math.min(next, hsv.s * vegCap);
  next = Math.min(next, 0.68);
  if (skin > 0) next = lerp(next, hsv.s, skin);
  return withSat(r, g, b, next);
}

function applyDay(r, g, b, isDay, satScale, highlight) {
  if (!isDay) return [r, g, b];
  const skin = skinMask(r, g, b);
  const protect = protectColorMask(r, g, b);
  const y = luma(r, g, b);
  let rgb = [r, g, b];
  if (skin < 0.4 && protect < 0.4 && satScale !== 1) {
    const hsv = rgbToHsv(r, g, b);
    const veg = vegetationMask(r, g, b);
    let next = Math.min(0.66, hsv.s * satScale);
    if (veg > 0.4) next = Math.min(next, hsv.s * 1.03);
    if (skin > 0) next = lerp(next, hsv.s, skin);
    rgb = withSat(r, g, b, next);
  }
  if (y > 0.84) {
    const pulled = lerp(y, 0.9, highlight * smoothstep(0.84, 0.98, y));
    rgb = scaleAroundLuma(rgb[0], rgb[1], rgb[2], Math.min(y, pulled));
  }
  return rgb;
}

function applyNight(r, g, b, isDay, blackLift, hazeStrength) {
  if (isDay) return [r, g, b];
  let rgb = [r, g, b];
  const y = luma(r, g, b);
  if (y < 0.12) {
    const lifted = Math.max(y, lerp(y, blackLift, 0.65));
    rgb = [rgb[0] + (lifted - y), rgb[1] + (lifted - y), rgb[2] + (lifted - y)];
  }
  const haze = hazeMask(rgb[0], rgb[1], rgb[2]);
  if (haze > 0 && y > 0.32) {
    const next = y * (1 - haze * hazeStrength * 0.55);
    rgb = scaleAroundLuma(rgb[0], rgb[1], rgb[2], Math.max(0.02, next));
  }
  return rgb;
}

function applyContrast(r, g, b, amount) {
  if (amount <= 0 || skinMask(r, g, b) > 0.55) return [r, g, b];
  const y = luma(r, g, b);
  const curved = clamp01((y - 0.5) * (1 + amount) + 0.5);
  return scaleAroundLuma(r, g, b, curved);
}

export function lutLook(r, g, b) {
  const y = luma(r, g, b);
  const curved = clamp01((y - 0.5) * 1.025 + 0.5);
  let rgb = scaleAroundLuma(r, g, b, Math.min(curved, 0.97));
  if (skinMask(rgb[0], rgb[1], rgb[2]) < 0.4 && protectColorMask(rgb[0], rgb[1], rgb[2]) < 0.4) {
    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    rgb = withSat(rgb[0], rgb[1], rgb[2], Math.min(0.66, hsv.s * 1.02));
  }
  return rgb;
}

function mixLut(r, g, b, mix) {
  const graded = lutLook(r, g, b);
  return [
    lerp(r, graded[0], mix),
    lerp(g, graded[1], mix),
    lerp(b, graded[2], mix),
  ];
}

function applyAmbient(r, g, b, isDay, dayAmt, nightAmt) {
  const amount = isDay ? dayAmt : nightAmt;
  if (amount <= 0 || skinMask(r, g, b) > 0.3 || protectColorMask(r, g, b) > 0.3) return [r, g, b];
  const y = luma(r, g, b);
  if (y > 0.55) return [r, g, b];
  const shadow = 1 - smoothstep(0.15, 0.55, y);
  if (isDay) return [r + amount * shadow * 0.4, g + amount * shadow * 0.28, b];
  return [r, g + amount * shadow * 0.15, b + amount * shadow * 0.45];
}

function protectPixel(r, g, b, ceiling) {
  let rgb = [r, g, b];
  const skin = skinMask(r, g, b);
  if (skin > 0.25) {
    const hsv = rgbToHsv(r, g, b);
    const sat = lerp(hsv.s, clamp01(Math.min(hsv.s, 0.52)), skin);
    const hue = hsv.h < 6 || hsv.h > 50 ? lerp(hsv.h, 22, skin * 0.35) : hsv.h;
    rgb = hsvToRgbSafe(hue, sat, hsv.v);
  }
  const y = luma(rgb[0], rgb[1], rgb[2]);
  if (y > ceiling) rgb = scaleAroundLuma(rgb[0], rgb[1], rgb[2], ceiling);
  const sat = satOf(rgb[0], rgb[1], rgb[2]);
  if (sat < 0.06 && y > 0.72) {
    const neutral = y;
    const keep = 0.35;
    rgb = [
      lerp(neutral, rgb[0], keep),
      lerp(neutral, rgb[1], keep),
      lerp(neutral, rgb[2], keep),
    ];
    if (luma(rgb[0], rgb[1], rgb[2]) > ceiling) rgb = scaleAroundLuma(rgb[0], rgb[1], rgb[2], ceiling);
  }
  return rgb.map(clamp01);
}

function hsvToRgbSafe(h, s, v) {
  const wrapped = ((h % 360) + 360) % 360;
  const c = v * s;
  const hp = wrapped / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [r + m, g + m, b + m];
}

function clearView(image, amount, taps) {
  if (amount <= 0 || taps <= 0) return image;
  const { width, height, data } = image;
  const out = new Float32Array(data.length);
  const radius = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const center = [data[i], data[i + 1], data[i + 2]];
      let ar = 0;
      let ag = 0;
      let ab = 0;
      const used = CLEAR_TAPS.slice(0, taps);
      for (const [ox, oy] of used) {
        const s = sample(data, width, height, x + ox * radius, y + oy * radius);
        ar += s[0];
        ag += s[1];
        ab += s[2];
      }
      const inv = 1 / used.length;
      const avg = [ar * inv, ag * inv, ab * inv];
      const yv = luma(center[0], center[1], center[2]);
      const haze = hazeMask(center[0], center[1], center[2]);
      const local = luma(avg[0], avg[1], avg[2]);
      const delta = yv - local;
      let next = yv;
      if (delta < -0.01) next = yv + delta * amount * 0.45;
      else if (Math.abs(delta) <= 0.02 && haze > 0.55) next = yv - haze * amount * 0.045;
      next = Math.min(yv + 0.008, Math.max(0, next));
      write(out, i, scaleAroundLuma(center[0], center[1], center[2], clamp01(next)));
    }
  }
  return { width, height, data: out };
}

function bloom(image, threshold, intensity, taps) {
  if (intensity <= 0 || taps <= 0) return image;
  const { width, height, data } = image;
  const out = new Float32Array(data);
  const used = BLOOM_TAPS.slice(0, taps);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let ar = 0;
      let ag = 0;
      let ab = 0;
      let weight = 0;
      for (const [ox, oy] of used) {
        const s = sample(data, width, height, Math.round(x + ox), Math.round(y + oy));
        const yv = luma(s[0], s[1], s[2]);
        const wgt = Math.max(0, yv - threshold);
        ar += s[0] * wgt;
        ag += s[1] * wgt;
        ab += s[2] * wgt;
        weight += wgt;
      }
      if (weight <= 0) continue;
      const i = (y * width + x) * 3;
      const add = intensity / used.length;
      out[i] += (ar / used.length) * add;
      out[i + 1] += (ag / used.length) * add;
      out[i + 2] += (ab / used.length) * add;
    }
  }
  return { width, height, data: out };
}

function sharpen(image, amount) {
  if (amount <= 0) return image;
  const { width, height, data } = image;
  const out = new Float32Array(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const c = [data[i], data[i + 1], data[i + 2]];
      const n = [
        sample(data, width, height, x + 1, y),
        sample(data, width, height, x - 1, y),
        sample(data, width, height, x, y + 1),
        sample(data, width, height, x, y - 1),
      ];
      const blur = n.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
        .map((v) => v / 4);
      const detail = [c[0] - blur[0], c[1] - blur[1], c[2] - blur[2]];
      const edge = Math.abs(luma(detail[0], detail[1], detail[2]));
      const gain = amount * (1 - smoothstep(0.08, 0.28, edge));
      const next = [
        c[0] + detail[0] * gain,
        c[1] + detail[1] * gain,
        c[2] + detail[2] * gain,
      ];
      const neighborMax = Math.max(...n.map((p) => luma(p[0], p[1], p[2])));
      const cap = neighborMax + 0.03;
      const yv = luma(next[0], next[1], next[2]);
      write(out, i, yv > cap ? scaleAroundLuma(next[0], next[1], next[2], cap) : next);
    }
  }
  return { width, height, data: out };
}

function reflections(image, strength, taps) {
  if (strength <= 0 || taps <= 0) return image;
  const { width, height, data } = image;
  const out = new Float32Array(data);
  for (let y = 0; y < height; y += 1) {
    const yNorm = y / (height - 1);
    if (yNorm < 0.55) continue;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const c = [data[i], data[i + 1], data[i + 2]];
      if (roadMask(c[0], c[1], c[2], yNorm) < 0.4) continue;
      let ar = 0;
      let ag = 0;
      let ab = 0;
      const count = Math.max(1, taps);
      for (let t = 0; t < count; t += 1) {
        const s = sample(data, width, height, x + (t - count / 2), y - 6 - t);
        ar += s[0];
        ag += s[1];
        ab += s[2];
      }
      const inv = 1 / count;
      const src = [ar * inv, ag * inv, ab * inv];
      const srcY = luma(src[0], src[1], src[2]);
      if (srcY < 0.45) continue;
      const add = strength * (srcY - 0.45);
      out[i] = clamp01(c[0] + src[0] * add);
      out[i + 1] = clamp01(c[1] + src[1] * add);
      out[i + 2] = clamp01(c[2] + src[2] * add);
    }
  }
  return { width, height, data: out };
}

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function roadDetail(x, y, size) {
  const u = (x % size) / size;
  const v = (y % size) / size;
  const n1 = hash2(Math.floor(u * 64), Math.floor(v * 64));
  const n2 = hash2(Math.floor(u * 180), Math.floor(v * 180));
  const crack = Math.abs(hash2(Math.floor(u * 24), Math.floor(v * 9)) - 0.5) < 0.04 ? 0.35 : 1;
  return (0.78 + n1 * 0.16 + n2 * 0.06) * crack;
}

function applyRoad(image, strength, size) {
  if (strength <= 0) return image;
  const { width, height, data } = image;
  const out = new Float32Array(data);
  for (let y = 0; y < height; y += 1) {
    const yNorm = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const c = [data[i], data[i + 1], data[i + 2]];
      const mask = roadMask(c[0], c[1], c[2], yNorm);
      if (mask < 0.25) continue;
      const detail = roadDetail(x, y, size);
      const factor = lerp(1, 0.86 + detail * 0.28, strength * mask);
      out[i] = clamp01(c[0] * factor);
      out[i + 1] = clamp01(c[1] * factor);
      out[i + 2] = clamp01(c[2] * factor);
    }
  }
  return { width, height, data: out };
}

function vignette(r, g, b, x, y, width, height, amount) {
  if (amount <= 0 || luma(r, g, b) > 0.7) return [r, g, b];
  const nx = (x / (width - 1)) * 2 - 1;
  const ny = (y / (height - 1)) * 2 - 1;
  const d = Math.min(1, Math.sqrt(nx * nx + ny * ny));
  const dark = smoothstep(0.72, 1.2, d) * amount;
  return [r * (1 - dark), g * (1 - dark), b * (1 - dark)];
}

export function rainDelta(x, y, amount) {
  if (amount <= 0) return 0;
  const column = Math.floor(x + y * 0.35);
  const drop = hash2(column, Math.floor(y * 0.5));
  if (drop < 0.92) return 0;
  const size = 0.5 + hash2(column, 3);
  return amount * 0.035 * size;
}

function applyRain(image, amount) {
  if (amount <= 0) return image;
  return mapPixels(image, (r, g, b, x, y) => {
    const delta = rainDelta(x, y, amount);
    if (delta === 0) return [r, g, b];
    return [clamp01(r + delta), clamp01(g + delta), clamp01(b + delta * 1.05)];
  });
}

export function gradeImage(image, profileName, options = {}) {
  const catalog = options.catalog || loadCatalog();
  if (String(profileName).toLowerCase() === 'off') {
    return {
      width: image.width,
      height: image.height,
      data: new Float32Array(image.data),
      sceneLuma: averageLuma(image),
      isDay: true,
      profile: 'off',
    };
  }
  const resolved = resolveProfileName(catalog, profileName);
  const profile = getProfile(catalog, resolved);
  const fx = profile.effects;
  let current = { width: image.width, height: image.height, data: new Float32Array(image.data) };

  if (fx.exposure.enabled) current = mapPixels(current, (r, g, b) => exposure(r, g, b, fx.exposure.bias));
  if (fx.highlight.enabled) {
    current = mapPixels(current, (r, g, b) => highlightRecovery(r, g, b, fx.highlight.start, fx.highlight.strength));
  }
  if (fx.tonemap.enabled) current = mapPixels(current, (r, g, b) => tonemap(r, g, b, fx.tonemap.strength));
  if (fx.shadows.enabled) current = mapPixels(current, (r, g, b) => liftShadows(r, g, b, fx.shadows.lift));

  const sceneLuma = averageLuma(current);
  const isDay = options.timeOfDay ? options.timeOfDay === 'day' : sceneLuma >= 0.42;
  const clearAmount = isDay ? fx.clearview.day : fx.clearview.night;
  if (fx.clearview.enabled) current = clearView(current, clearAmount, fx.clearview.taps);
  if (fx.lamps.enabled) current = mapPixels(current, (r, g, b) => applyLamps(r, g, b, fx.lamps.strength));
  if (fx.reflections.enabled) current = reflections(current, fx.reflections.strength, fx.reflections.taps);
  if (fx.road.enabled) current = applyRoad(current, fx.road.strength, profile.roads.size);
  if (fx.bloom.enabled) current = bloom(current, fx.bloom.threshold, fx.bloom.intensity, fx.bloom.taps);
  if (fx.day.enabled) current = mapPixels(current, (r, g, b) => applyDay(r, g, b, isDay, fx.day.sat, fx.day.highlight));
  if (fx.night.enabled) current = mapPixels(current, (r, g, b) => applyNight(r, g, b, isDay, fx.night.blackLift, fx.night.haze));
  if (fx.contrast.enabled) current = mapPixels(current, (r, g, b) => applyContrast(r, g, b, fx.contrast.amount));
  if (fx.color.enabled) current = mapPixels(current, (r, g, b) => applyColor(r, g, b, fx.color.vibrance, fx.color.vegCap));
  if (fx.lut.enabled) current = mapPixels(current, (r, g, b) => mixLut(r, g, b, fx.lut.mix));
  if (fx.ambient.enabled) {
    current = mapPixels(current, (r, g, b) => applyAmbient(r, g, b, isDay, fx.ambient.day, fx.ambient.night));
  }
  if (fx.protection.enabled) current = mapPixels(current, (r, g, b) => protectPixel(r, g, b, fx.protection.ceiling));
  if (fx.sharp.enabled) current = sharpen(current, fx.sharp.amount);
  if (fx.vignette.enabled) {
    current = mapPixels(current, (r, g, b, x, y) => vignette(r, g, b, x, y, current.width, current.height, fx.vignette.amount));
  }
  const rainOn = options.menu !== true && (fx.rain.enabled || options.forceRain === true);
  if (rainOn) current = applyRain(current, fx.rain.amount * fx.rain.drops);

  return { ...current, sceneLuma, isDay, profile: resolved };
}

export function pixel(image, x, y) {
  const i = (y * image.width + x) * 3;
  return [image.data[i], image.data[i + 1], image.data[i + 2]];
}

export function fill(width, height, rgb) {
  const data = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 3] = rgb[0];
    data[i * 3 + 1] = rgb[1];
    data[i * 3 + 2] = rgb[2];
  }
  return { width, height, data };
}

export function paint(image, x, y, rgb) {
  const i = (y * image.width + x) * 3;
  image.data[i] = rgb[0];
  image.data[i + 1] = rgb[1];
  image.data[i + 2] = rgb[2];
}
