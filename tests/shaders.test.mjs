import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadCatalog } from '../src/engine/catalog.js';

const shader = readFileSync(new URL('../src/shaders/FGM.fx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/shaders/FGM.fxh', import.meta.url), 'utf8');
const installer = readFileSync(new URL('../installer/FGM-Install.ps1', import.meta.url), 'utf8');

test('every catalog technique exists once and does not sample depth', () => {
  const catalog = loadCatalog();
  for (const name of catalog.techniqueOrder) {
    assert.equal(shader.includes(`technique ${name}`), true, name);
  }
  const combined = `${shader}\n${header}`;
  for (const banned of ['GetLinearizedDepth', 'DepthBuffer', 'DepthStencil', 'NETWORK']) {
    assert.equal(combined.includes(banned), false, banned);
  }
  assert.match(shader, /RainAmount[\s\S]*?= 0\.0;/);
  assert.match(shader, /GrainAmount[\s\S]*?= 0\.0;/);
  assert.match(shader, /ChromaAmount[\s\S]*?= 0\.0;/);
});

test('the installer pins the official ReShade setup and refuses the addon build', () => {
  assert.match(installer, /https:\/\/reshade\.me\/downloads\/ReShade_Setup_6\.8\.0\.exe/);
  assert.match(installer, /207aea16205fbf952bc8fe1879966672454cf04002e7ad34237c7990a5b3c0b4/);
  assert.match(installer, /Addon/);
  assert.equal(installer.includes('ReShade_Setup_6.8.0_Addon.exe'), false);
  for (const forbidden of ['FiveM.exe', 'GTA5.exe', 'update.rpf', 'CitizenFX.ini']) {
    assert.equal(installer.includes(forbidden), true);
  }
});
