import { roadDetail } from './pipeline.js';

export const ROAD_LUMA_SCALE = 0.2126 + 0.7152 * 0.98 + 0.0722 * 0.94;

export function roadColor(detail) {
  const g = Math.min(1, Math.max(0, detail));
  return [g, g * 0.98, g * 0.94];
}

export function decodeRoadDetail(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / ROAD_LUMA_SCALE;
}

export function bakeRoad(size) {
  const data = new Uint8ClampedArray(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const rgb = roadColor(roadDetail(x, y, size));
      const i = (y * size + x) * 3;
      data[i] = Math.round(rgb[0] * 255);
      data[i + 1] = Math.round(rgb[1] * 255);
      data[i + 2] = Math.round(rgb[2] * 255);
    }
  }
  return { width: size, height: size, data };
}
