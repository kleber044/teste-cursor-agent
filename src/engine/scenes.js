import { fill, paint } from './pipeline.js';

function rect(image, x, y, w, h, rgb) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(image.width, x + w);
  const y1 = Math.min(image.height, y + h);
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) paint(image, xx, yy, rgb);
  }
}

function shadeSky(image, top, bottom) {
  for (let y = 0; y < image.height; y += 1) {
    const t = y / (image.height - 1);
    const rgb = [
      top[0] + (bottom[0] - top[0]) * t,
      top[1] + (bottom[1] - top[1]) * t,
      top[2] + (bottom[2] - top[2]) * t,
    ];
    rect(image, 0, y, image.width, 1, rgb);
  }
}

function disc(image, cx, cy, radius, rgb) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) paint(image, x, y, rgb);
    }
  }
}

function person(image, x, y) {
  disc(image, x + 8, y + 6, 6, [0.72, 0.5, 0.38]);
  rect(image, x + 2, y + 14, 12, 16, [0.74, 0.16, 0.14]);
  rect(image, x + 3, y + 30, 10, 14, [0.12, 0.18, 0.38]);
}

function tree(image, x, y, scale = 1) {
  const leaf = [0.16, 0.36, 0.14];
  disc(image, x, y, 16 * scale, leaf);
  disc(image, x - 10 * scale, y + 6 * scale, 11 * scale, [0.14, 0.32, 0.12]);
  disc(image, x + 11 * scale, y + 4 * scale, 12 * scale, [0.18, 0.4, 0.15]);
  rect(image, x - 3, y + 8 * scale, 6, 22 * scale, [0.28, 0.18, 0.1]);
}

const SCENES = {
  'day-city': (image) => {
    shadeSky(image, [0.46, 0.64, 0.84], [0.74, 0.8, 0.86]);
    disc(image, 250, 36, 12, [0.93, 0.9, 0.8]);
    rect(image, 40, 48, 70, 8, [0.9, 0.91, 0.92]);
    rect(image, 18, 70, 46, 70, [0.48, 0.34, 0.3]);
    rect(image, 70, 54, 58, 86, [0.55, 0.58, 0.62]);
    rect(image, 136, 78, 40, 62, [0.32, 0.36, 0.4]);
    rect(image, 28, 86, 8, 10, [0.85, 0.82, 0.7]);
    rect(image, 86, 70, 8, 10, [0.75, 0.84, 0.9]);
    tree(image, 230, 78, 1);
    person(image, 150, 96);
    rect(image, 0, 128, image.width, image.height - 128, [0.24, 0.24, 0.25]);
    rect(image, 0, 146, image.width, 3, [0.72, 0.72, 0.68]);
  },
  'day-vegetation': (image) => {
    shadeSky(image, [0.5, 0.66, 0.84], [0.7, 0.78, 0.8]);
    tree(image, 50, 70, 1.4);
    tree(image, 130, 60, 1.7);
    tree(image, 230, 78, 1.3);
    tree(image, 290, 66, 1.1);
    rect(image, 0, 140, image.width, 40, [0.2, 0.32, 0.14]);
  },
  'day-character': (image) => {
    shadeSky(image, [0.55, 0.68, 0.84], [0.78, 0.8, 0.78]);
    rect(image, 0, 120, image.width, 60, [0.42, 0.4, 0.36]);
    person(image, 146, 70);
  },
  'day-clothes': (image) => {
    shadeSky(image, [0.62, 0.72, 0.82], [0.8, 0.82, 0.8]);
    rect(image, 30, 40, 50, 90, [0.74, 0.16, 0.14]);
    rect(image, 100, 40, 50, 90, [0.12, 0.28, 0.72]);
    rect(image, 170, 40, 50, 90, [0.85, 0.72, 0.16]);
    rect(image, 240, 40, 50, 90, [0.18, 0.55, 0.28]);
  },
  'day-sky': (image) => {
    shadeSky(image, [0.42, 0.62, 0.9], [0.78, 0.84, 0.88]);
    disc(image, 80, 40, 18, [0.95, 0.93, 0.86]);
    rect(image, 140, 36, 90, 14, [0.92, 0.93, 0.94]);
    rect(image, 180, 58, 70, 10, [0.88, 0.9, 0.93]);
  },
  'day-walls': (image) => {
    shadeSky(image, [0.55, 0.68, 0.82], [0.7, 0.74, 0.78]);
    rect(image, 20, 30, 120, 120, [0.93, 0.93, 0.91]);
    rect(image, 160, 50, 130, 100, [0.86, 0.86, 0.84]);
  },
  'day-asphalt': (image) => {
    shadeSky(image, [0.5, 0.62, 0.78], [0.62, 0.66, 0.7]);
    rect(image, 0, 70, image.width, image.height - 70, [0.28, 0.28, 0.29]);
    rect(image, 40, 90, 8, 70, [0.62, 0.6, 0.56]);
    rect(image, 150, 100, 26, 8, [0.18, 0.18, 0.18]);
    rect(image, 0, 150, image.width, 6, [0.7, 0.7, 0.64]);
  },
  'night-lamps': (image) => {
    shadeSky(image, [0.02, 0.03, 0.06], [0.08, 0.09, 0.12]);
    rect(image, 0, 120, image.width, 60, [0.08, 0.08, 0.09]);
    rect(image, 70, 48, 10, 72, [0.1, 0.1, 0.11]);
    rect(image, 64, 40, 22, 14, [0.98, 0.78, 0.22]);
    rect(image, 210, 48, 10, 72, [0.1, 0.1, 0.11]);
    rect(image, 204, 40, 22, 14, [0.96, 0.74, 0.2]);
  },
  'night-distance': (image) => {
    shadeSky(image, [0.03, 0.04, 0.07], [0.16, 0.17, 0.2]);
    rect(image, 0, 100, image.width, 24, [0.58, 0.6, 0.62]);
    rect(image, 30, 78, 18, 40, [0.22, 0.24, 0.28]);
    rect(image, 80, 70, 14, 48, [0.18, 0.2, 0.24]);
    rect(image, 140, 84, 22, 34, [0.2, 0.22, 0.26]);
    rect(image, 230, 88, 8, 8, [0.9, 0.72, 0.24]);
    rect(image, 0, 124, image.width, 56, [0.07, 0.07, 0.08]);
  },
  'night-asphalt': (image) => {
    shadeSky(image, [0.02, 0.025, 0.04], [0.05, 0.06, 0.08]);
    rect(image, 0, 80, image.width, 100, [0.1, 0.1, 0.11]);
    rect(image, 70, 30, 16, 10, [0.98, 0.76, 0.22]);
    rect(image, 60, 110, 40, 18, [0.55, 0.42, 0.16]);
  },
  'night-car': (image) => {
    shadeSky(image, [0.02, 0.03, 0.05], [0.06, 0.07, 0.1]);
    rect(image, 0, 120, image.width, 60, [0.09, 0.09, 0.1]);
    rect(image, 90, 88, 140, 36, [0.12, 0.16, 0.24]);
    rect(image, 96, 96, 18, 10, [0.86, 0.05, 0.04]);
    rect(image, 206, 96, 18, 10, [0.9, 0.06, 0.04]);
    rect(image, 150, 100, 20, 8, [0.7, 0.78, 0.9]);
  },
  'night-neon': (image) => {
    shadeSky(image, [0.03, 0.03, 0.05], [0.06, 0.05, 0.08]);
    rect(image, 40, 36, 200, 90, [0.08, 0.08, 0.1]);
    rect(image, 60, 56, 70, 16, [0.9, 0.08, 0.72]);
    rect(image, 150, 70, 60, 12, [0.1, 0.75, 0.85]);
  },
  'night-signal': (image) => {
    shadeSky(image, [0.02, 0.03, 0.05], [0.05, 0.06, 0.08]);
    rect(image, 150, 30, 8, 110, [0.12, 0.12, 0.13]);
    rect(image, 140, 36, 28, 48, [0.05, 0.05, 0.06]);
    disc(image, 154, 48, 6, [0.86, 0.05, 0.04]);
    disc(image, 154, 66, 6, [0.05, 0.72, 0.12]);
  },
  rain: (image) => {
    shadeSky(image, [0.05, 0.06, 0.08], [0.1, 0.11, 0.13]);
    rect(image, 0, 100, image.width, 80, [0.12, 0.13, 0.14]);
    rect(image, 40, 40, 14, 8, [0.9, 0.9, 0.92]);
    rect(image, 180, 70, 80, 28, [0.16, 0.2, 0.28]);
    rect(image, 40, 120, 90, 16, [0.45, 0.48, 0.52]);
  },
  movement: (image) => {
    shadeSky(image, [0.02, 0.03, 0.05], [0.05, 0.06, 0.08]);
    rect(image, 0, 130, image.width, 50, [0.08, 0.08, 0.09]);
    rect(image, 20, 78, 200, 4, [0.62, 0.5, 0.22]);
    rect(image, 40, 90, 160, 2, [0.55, 0.44, 0.18]);
    rect(image, 250, 70, 18, 12, [0.98, 0.78, 0.22]);
  },
  distance: (image) => {
    shadeSky(image, [0.7, 0.74, 0.78], [0.78, 0.8, 0.82]);
    rect(image, 40, 60, 36, 70, [0.58, 0.6, 0.64]);
    rect(image, 100, 48, 28, 82, [0.5, 0.54, 0.6]);
    rect(image, 160, 70, 50, 60, [0.62, 0.64, 0.68]);
    rect(image, 240, 80, 20, 8, [0.72, 0.62, 0.28]);
  },
};

export const SCENE_NAMES = Object.keys(SCENES);

export function renderScene(name, width = 320, height = 180) {
  const draw = SCENES[name];
  if (!draw) throw new Error(`Cena desconhecida: ${name}`);
  const image = fill(width, height, [0, 0, 0]);
  draw(image);
  return image;
}

const FONT = {
  A: ['010', '101', '111', '101', '101'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '101', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '010'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '101', '111', '101'],
  Y: ['101', '101', '010', '010', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

export function drawLabel(image, text, x, y, scale = 2) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = FONT[char] || FONT[' '];
    glyph.forEach((row, gy) => {
      [...row].forEach((bit, gx) => {
        if (bit !== '1') return;
        rect(image, cursor + gx * scale, y + gy * scale, scale, scale, [0.05, 0.05, 0.05]);
      });
    });
    cursor += 4 * scale;
  }
}
