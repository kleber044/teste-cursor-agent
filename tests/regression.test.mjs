import assert from 'node:assert/strict';
import test from 'node:test';
import { luma, rgbToHsv, satOf, vegetationMask } from '../src/engine/color.js';
import { fill, gradeImage, paint, pixel, rainDelta } from '../src/engine/pipeline.js';

function paintRect(image, x, y, w, h, rgb) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) paint(image, xx, yy, rgb);
  }
}

test('default grading does not draw rain, including on a flat menu frame', () => {
  const menu = fill(48, 32, [0.08, 0.09, 0.11]);
  paintRect(menu, 8, 6, 32, 16, [0.12, 0.13, 0.16]);
  const graded = gradeImage(menu, 'ultra', { menu: true });
  let maxDelta = 0;
  for (let i = 0; i < menu.data.length; i += 1) {
    maxDelta = Math.max(maxDelta, Math.abs(menu.data[i] - graded.data[i]));
  }
  assert.equal(rainDelta(10, 10, 0), 0);
  assert.ok(maxDelta < 0.2);
  const forcedOff = gradeImage(menu, 'ultra');
  assert.equal(forcedOff.profile, 'ultra');
});

test('street lamps and motion streaks lose the yellow cast', () => {
  const image = fill(32, 24, [0.05, 0.06, 0.08]);
  paintRect(image, 8, 6, 4, 4, [0.98, 0.78, 0.22]);
  paintRect(image, 4, 16, 20, 1, [0.62, 0.5, 0.22]);
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'night' });
  const lamp = pixel(graded, 9, 7);
  const streak = pixel(graded, 12, 16);
  assert.ok(satOf(...lamp) < 0.28, `lamp sat ${satOf(...lamp)}`);
  assert.ok(satOf(...streak) < satOf(0.62, 0.5, 0.22) - 0.08, `streak sat ${satOf(...streak)}`);
  assert.ok(Math.abs(luma(...lamp) - luma(0.98, 0.78, 0.22)) < 0.16);
});

test('neons, signals and taillights keep their color', () => {
  const image = fill(40, 24, [0.04, 0.05, 0.07]);
  paintRect(image, 4, 4, 4, 4, [0.9, 0.08, 0.72]);
  paintRect(image, 16, 4, 3, 3, [0.86, 0.05, 0.04]);
  paintRect(image, 24, 4, 3, 3, [0.05, 0.72, 0.12]);
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'night' });
  const neon = rgbToHsv(...pixel(graded, 5, 5));
  const tail = rgbToHsv(...pixel(graded, 17, 5));
  const signal = rgbToHsv(...pixel(graded, 25, 5));
  assert.ok(neon.s > 0.62, `neon sat ${neon.s}`);
  assert.ok(tail.h < 20 || tail.h > 340, `tail hue ${tail.h}`);
  assert.ok(signal.h > 90 && signal.h < 160, `signal hue ${signal.h}`);
  assert.ok(signal.s > 0.45);
});

test('daytime saturation stays natural and skin does not drift', () => {
  const image = fill(36, 28, [0.55, 0.68, 0.86]);
  paintRect(image, 6, 8, 8, 8, [0.72, 0.5, 0.38]);
  paintRect(image, 18, 8, 10, 8, [0.18, 0.42, 0.16]);
  paintRect(image, 6, 18, 10, 6, [0.74, 0.16, 0.14]);
  const beforeSkin = rgbToHsv(0.72, 0.5, 0.38);
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'day' });
  const skin = rgbToHsv(...pixel(graded, 8, 10));
  const leaf = pixel(graded, 22, 11);
  const shirt = rgbToHsv(...pixel(graded, 8, 20));
  assert.ok(Math.abs(skin.h - beforeSkin.h) < 12, `skin hue ${skin.h}`);
  assert.ok(skin.s > 0.18 && skin.s < 0.62, `skin sat ${skin.s}`);
  assert.ok(satOf(...leaf) < 0.72, `leaf sat ${satOf(...leaf)}`);
  assert.ok(vegetationMask(...leaf) > 0.2 || satOf(...leaf) > 0.15);
  assert.ok(shirt.s > 0.45, `shirt sat ${shirt.s}`);
  assert.ok(shirt.h < 30 || shirt.h > 340);
});

test('highlights, white walls and lit asphalt do not blow out', () => {
  const image = fill(28, 20, [0.42, 0.4, 0.38]);
  paintRect(image, 4, 4, 8, 8, [0.94, 0.94, 0.93]);
  paintRect(image, 16, 12, 6, 4, [0.9, 0.88, 0.84]);
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'day' });
  for (const [x, y] of [[6, 6], [18, 13]]) {
    const p = pixel(graded, x, y);
    assert.ok(Math.max(...p) < 0.985, `clip ${p}`);
    assert.ok(luma(...p) <= 0.965, `luma ${luma(...p)}`);
  }
});

test('night stays readable without crushed blacks or a milky horizon', () => {
  const image = fill(32, 24, [0.03, 0.035, 0.045]);
  paintRect(image, 0, 4, 32, 4, [0.58, 0.6, 0.62]);
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'night' });
  const shadow = pixel(graded, 4, 16);
  const horizon = pixel(graded, 8, 5);
  assert.ok(luma(...shadow) > 0.012, `crushed ${luma(...shadow)}`);
  assert.ok(luma(...horizon) < luma(0.58, 0.6, 0.62) - 0.015, `milk ${luma(...horizon)}`);
});

test('clear view separates a distant building from white haze', () => {
  const image = fill(32, 24, [0.72, 0.74, 0.76]);
  paintRect(image, 8, 8, 10, 8, [0.6, 0.62, 0.66]);
  const before = Math.abs(luma(0.6, 0.62, 0.66) - luma(0.72, 0.74, 0.76));
  const graded = gradeImage(image, 'ultra', { timeOfDay: 'day' });
  const building = luma(...pixel(graded, 12, 12));
  const haze = luma(...pixel(graded, 2, 2));
  assert.ok(Math.abs(building - haze) > before * 0.8);
});

test('sharpen does not halo a hard vegetation edge the way the old quality preset did', () => {
  const image = fill(24, 16, [0.62, 0.78, 0.92]);
  paintRect(image, 8, 2, 8, 12, [0.12, 0.36, 0.1]);
  const ultra = gradeImage(image, 'ultra', { timeOfDay: 'day' });
  const low = gradeImage(image, 'low', { timeOfDay: 'day' });
  const sky = pixel(ultra, 4, 8);
  const skyLow = pixel(low, 4, 8);
  assert.ok(luma(...sky) < luma(0.62, 0.78, 0.92) + 0.05);
  assert.ok(Math.abs(luma(...sky) - luma(...skyLow)) < 0.12);
});

test('low keeps the lamp correction without adding bloom', () => {
  const image = fill(20, 16, [0.04, 0.05, 0.06]);
  paintRect(image, 8, 6, 3, 3, [0.97, 0.76, 0.2]);
  const low = gradeImage(image, 'low', { timeOfDay: 'night' });
  const off = gradeImage(image, 'off', { timeOfDay: 'night' });
  const lamp = pixel(low, 9, 7);
  const beside = pixel(low, 2, 2);
  const besideOff = pixel(off, 2, 2);
  assert.ok(satOf(...lamp) < 0.35);
  assert.ok(Math.abs(luma(...beside) - luma(...besideOff)) < 0.08);
});

test('quality alias matches ultra and does not invent a fifth look', () => {
  const image = fill(16, 12, [0.2, 0.22, 0.26]);
  paintRect(image, 4, 4, 4, 4, [0.95, 0.74, 0.18]);
  const ultra = gradeImage(image, 'ultra', { timeOfDay: 'night' });
  const quality = gradeImage(image, 'quality', { timeOfDay: 'night' });
  assert.equal(quality.profile, 'ultra');
  let delta = 0;
  for (let i = 0; i < ultra.data.length; i += 1) delta = Math.max(delta, Math.abs(ultra.data[i] - quality.data[i]));
  assert.equal(delta, 0);
});
