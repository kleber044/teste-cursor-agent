import { lutLook } from './pipeline.js';

export const LUT_SIZE = 32;

export function bakeLut() {
  const size = LUT_SIZE;
  const width = size * size;
  const height = size;
  const data = new Uint8ClampedArray(width * height * 3);
  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) {
        const rgb = lutLook(r / (size - 1), g / (size - 1), b / (size - 1));
        const x = b * size + r;
        const i = (g * width + x) * 3;
        data[i] = Math.round(Math.min(1, Math.max(0, rgb[0])) * 255);
        data[i + 1] = Math.round(Math.min(1, Math.max(0, rgb[1])) * 255);
        data[i + 2] = Math.round(Math.min(1, Math.max(0, rgb[2])) * 255);
      }
    }
  }
  return { width, height, data };
}

function texel(data, width, height, x, y) {
  const sx = Math.max(0, Math.min(width - 1, x));
  const sy = Math.max(0, Math.min(height - 1, y));
  const i = (sy * width + sx) * 3;
  return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
}

function bilinear(data, width, height, u, v) {
  const x = u * width - 0.5;
  const y = v * height - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const c00 = texel(data, width, height, x0, y0);
  const c10 = texel(data, width, height, x0 + 1, y0);
  const c01 = texel(data, width, height, x0, y0 + 1);
  const c11 = texel(data, width, height, x0 + 1, y0 + 1);
  return [0, 1, 2].map((channel) => {
    const a = c00[channel] + (c10[channel] - c00[channel]) * tx;
    const b = c01[channel] + (c11[channel] - c01[channel]) * tx;
    return a + (b - a) * ty;
  });
}

export function sampleLut(lut, r, g, b) {
  const size = LUT_SIZE;
  const blue = Math.min(size - 1, Math.max(0, b)) * (size - 1);
  const b0 = Math.floor(blue);
  const b1 = Math.min(size - 1, b0 + 1);
  const blend = blue - b0;
  const slice = (index) => {
    const u = (index * size + r * (size - 1) + 0.5) / (size * size);
    const v = (g * (size - 1) + 0.5) / size;
    return bilinear(lut.data, lut.width, lut.height, u, v);
  };
  const c0 = slice(b0);
  const c1 = slice(b1);
  return c0.map((value, index) => value + (c1[index] - value) * blend);
}
