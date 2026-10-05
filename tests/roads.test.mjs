import assert from 'node:assert/strict';
import test from 'node:test';
import { roadDetail } from '../src/engine/pipeline.js';
import { bakeRoad, decodeRoadDetail, roadColor } from '../src/engine/roads.js';

test('road detail repeats on the tile boundary and is not a flat fill', () => {
  assert.equal(roadDetail(0, 4, 64), roadDetail(64, 68, 64));
  assert.notEqual(roadDetail(0, 0, 64), roadDetail(3, 9, 64));
});

test('quantized road colors still decode the detail', () => {
  const baked = bakeRoad(32);
  let worst = 0;
  for (let y = 0; y < 32; y += 7) {
    for (let x = 0; x < 32; x += 5) {
      const i = (y * 32 + x) * 3;
      const decoded = decodeRoadDetail(baked.data[i] / 255, baked.data[i + 1] / 255, baked.data[i + 2] / 255);
      const expected = roadDetail(x, y, 32);
      worst = Math.max(worst, Math.abs(decoded - expected));
      const color = roadColor(expected);
      assert.ok(color[2] < color[0]);
    }
  }
  assert.ok(worst < 2 / 255, `worst ${worst}`);
});
