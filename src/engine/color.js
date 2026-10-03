export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

export function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 1e-6) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb(h, s, v) {
  const c = v * s;
  const hp = (((h % 360) + 360) % 360) / 60;
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

export function satOf(r, g, b) {
  return rgbToHsv(r, g, b).s;
}

export function withSat(r, g, b, sat) {
  const hsv = rgbToHsv(r, g, b);
  return hsvToRgb(hsv.h, clamp01(sat), hsv.v);
}

export function hueWindow(h, rise0, rise1, fall0, fall1) {
  const up = smoothstep(rise0, rise1, h);
  const down = 1 - smoothstep(fall0, fall1, h);
  return up * down;
}

export function skinMask(r, g, b) {
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  const hue = hueWindow(hsv.h, 4, 10, 30, 40);
  const sat = hueWindow(hsv.s, 0.12, 0.2, 0.5, 0.6);
  const light = hueWindow(y, 0.2, 0.3, 0.75, 0.86);
  return hue * sat * light;
}

export function vegetationMask(r, g, b) {
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  if (y < 0.05 || y > 0.75) return 0;
  const hue = hueWindow(hsv.h, 70, 90, 150, 170);
  const sat = smoothstep(0.12, 0.22, hsv.s) * (1 - smoothstep(0.72, 0.88, hsv.s));
  return hue * sat;
}

export function protectColorMask(r, g, b) {
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  if (y < 0.04) return 0;
  const red = hsv.s > 0.45 && y > 0.08 && (hsv.h < 18 || hsv.h > 345);
  const green = hsv.s > 0.4 && hsv.h > 85 && hsv.h < 165 && y > 0.08 && vegetationMask(r, g, b) < 0.35;
  const neon = hsv.s > 0.62 && y > 0.12 && (hsv.h < 20 || hsv.h > 80);
  return clamp01((red ? 1 : 0) + (green ? 1 : 0) + (neon ? 1 : 0));
}

export function lampMask(r, g, b) {
  if (skinMask(r, g, b) > 0.35 || protectColorMask(r, g, b) > 0.45) return 0;
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  const warm = hueWindow(hsv.h, 24, 36, 64, 78);
  const core = smoothstep(0.5, 0.72, y) * warm * smoothstep(0.12, 0.22, hsv.s) * (1 - smoothstep(0.82, 0.94, hsv.s));
  const streak = smoothstep(0.18, 0.32, y) * (1 - smoothstep(0.8, 0.92, y))
    * hueWindow(hsv.h, 30, 40, 72, 86)
    * smoothstep(0.04, 0.1, hsv.s) * (1 - smoothstep(0.62, 0.78, hsv.s));
  return clamp01(Math.max(core, streak * 0.9));
}

export function hazeMask(r, g, b) {
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  const neutral = 1 - smoothstep(0.045, 0.085, hsv.s);
  return neutral * smoothstep(0.42, 0.62, y);
}

export function roadMask(r, g, b, yNorm) {
  const hsv = rgbToHsv(r, g, b);
  const y = luma(r, g, b);
  if (yNorm < 0.62) return 0;
  if (skinMask(r, g, b) > 0.2 || vegetationMask(r, g, b) > 0.25) return 0;
  const gray = 1 - smoothstep(0.08, 0.28, hsv.s);
  const asphalt = smoothstep(0.05, 0.12, y) * (1 - smoothstep(0.62, 0.82, y));
  return gray * asphalt;
}
