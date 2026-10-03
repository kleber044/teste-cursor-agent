import assert from 'node:assert/strict';
import test from 'node:test';
import { luma, rgbToHsv, satOf } from '../src/engine/color.js';
import { gradeImage, pixel } from '../src/engine/pipeline.js';
import { renderScene } from '../src/engine/scenes.js';

test('character, clothes, vegetation and daylight stay in a natural range', () => {
  const scene = renderScene('day-character', 320, 180);
  const graded = gradeImage(scene, 'ultra', { timeOfDay: 'day' });
  const skin = rgbToHsv(...pixel(graded, 154, 76));
  assert.ok(skin.h > 8 && skin.h < 40, `skin hue ${skin.h}`);
  assert.ok(skin.s > 0.18 && skin.s < 0.62, `skin sat ${skin.s}`);
  const clothes = renderScene('day-clothes', 320, 180);
  const gradedClothes = gradeImage(clothes, 'ultra', { timeOfDay: 'day' });
  const red = rgbToHsv(...pixel(gradedClothes, 50, 70));
  assert.ok(red.s > 0.45, `red sat ${red.s}`);
  const leaves = gradeImage(renderScene('day-vegetation', 320, 180), 'ultra', { timeOfDay: 'day' });
  assert.ok(satOf(...pixel(leaves, 130, 60)) < 0.72);
});

test('night lamps, neons and signals survive the full scene grade', () => {
  const lamps = gradeImage(renderScene('night-lamps', 320, 180), 'ultra', { timeOfDay: 'night' });
  assert.ok(satOf(...pixel(lamps, 74, 46)) < 0.35);
  const neon = rgbToHsv(...pixel(gradeImage(renderScene('night-neon', 320, 180), 'ultra', { timeOfDay: 'night' }), 80, 62));
  assert.ok(neon.s > 0.55, `neon ${neon.s}`);
  const signal = rgbToHsv(...pixel(gradeImage(renderScene('night-signal', 320, 180), 'ultra', { timeOfDay: 'night' }), 154, 66));
  assert.ok(signal.h > 90 && signal.h < 160, `signal ${signal.h}`);
});

test('motion streaks lose yellow and distant structures stay separated', () => {
  const source = renderScene('movement', 320, 180);
  const graded = gradeImage(source, 'ultra', { timeOfDay: 'night' });
  assert.ok(satOf(...pixel(graded, 80, 79)) < satOf(...pixel(source, 80, 79)) - 0.08);
  const distant = renderScene('distance', 320, 180);
  const before = Math.abs(luma(...pixel(distant, 10, 10)) - luma(...pixel(distant, 50, 80)));
  const gradedDistant = gradeImage(distant, 'ultra', { timeOfDay: 'day' });
  const after = Math.abs(luma(...pixel(gradedDistant, 10, 10)) - luma(...pixel(gradedDistant, 50, 80)));
  assert.ok(after > before * 0.75, `before ${before} after ${after}`);
});

test('rain stays out until it is explicitly forced, and low has no drops to force', () => {
  const scene = renderScene('rain', 320, 180);
  const normal = gradeImage(scene, 'ultra', { timeOfDay: 'night' });
  const again = gradeImage(scene, 'ultra', { timeOfDay: 'night' });
  const forced = gradeImage(scene, 'ultra', { timeOfDay: 'night', forceRain: true });
  const low = gradeImage(scene, 'low', { timeOfDay: 'night' });
  const lowForced = gradeImage(scene, 'low', { timeOfDay: 'night', forceRain: true });
  let same = 0;
  let forcedDelta = 0;
  let lowDelta = 0;
  for (let i = 0; i < scene.data.length; i += 1) {
    same = Math.max(same, Math.abs(normal.data[i] - again.data[i]));
    forcedDelta = Math.max(forcedDelta, Math.abs(normal.data[i] - forced.data[i]));
    lowDelta = Math.max(lowDelta, Math.abs(low.data[i] - lowForced.data[i]));
  }
  assert.equal(same, 0);
  assert.ok(forcedDelta > 0.01, 'ultra rain preview should change pixels');
  assert.equal(lowDelta, 0);
});
