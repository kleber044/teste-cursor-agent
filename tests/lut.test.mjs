import assert from 'node:assert/strict';
import test from 'node:test';
import { bakeLut, sampleLut } from '../src/engine/lut.js';
import { lutLook } from '../src/engine/pipeline.js';

test('the baked LUT is a 32-deep strip and round-trips lattice colors', () => {
  const lut = bakeLut();
  assert.equal(lut.width, 1024);
  assert.equal(lut.height, 32);
  for (const index of [0, 7, 15, 31]) {
    const value = index / 31;
    const expected = lutLook(value, value, value);
    const sampled = sampleLut(lut, value, value, value);
    expected.forEach((channel, i) => {
      assert.ok(Math.abs(channel - sampled[i]) < 1.5 / 255, `${index} ${channel} vs ${sampled[i]}`);
    });
  }
});
