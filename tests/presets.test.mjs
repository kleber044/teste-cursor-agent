import assert from 'node:assert/strict';
import test from 'node:test';
import { activeTechniques, loadCatalog } from '../src/engine/catalog.js';
import { getProfile } from '../src/engine/catalog.js';
import { renderPreset } from '../src/engine/presets.js';

const catalog = loadCatalog();

test('presets follow the profile, leave rain off, and keep tier values ready', () => {
  for (const name of ['ultra', 'high', 'medium', 'low']) {
    const text = renderPreset(catalog, name);
    const techniques = text.split('\n')[0].replace('Techniques=', '').split(',').filter(Boolean);
    const expected = activeTechniques(catalog, getProfile(catalog, name)).map((item) => `${item}@FGM.fx`);
    assert.deepEqual(techniques, expected);
    assert.equal(text.includes('FGM_Rain@FGM.fx'), false);
    assert.equal(text.includes('FGM_FilmGrain@FGM.fx'), false);
    assert.equal(text.includes('FGM_ChromaticAberration@FGM.fx'), false);
    assert.match(text, /^TechniqueSorting=/m);
  }
  const ultra = renderPreset(catalog, 'ultra');
  const low = renderPreset(catalog, 'low');
  assert.match(ultra, /ExposureBias=0\.020000/);
  assert.match(ultra, /ClearTaps=8/);
  assert.match(ultra, /BloomTaps=12/);
  assert.match(ultra, /RainAmount=0\.850000/);
  assert.match(low, /BloomIntensity=0\.000000/);
  assert.match(low, /ReflectTaps=0/);
  assert.match(low, /RainAmount=0\.000000/);
  assert.equal(low.includes('FGM_Bloom@FGM.fx'), false);
});
