import assert from 'node:assert/strict';
import test from 'node:test';
import { activeTechniques, estimateCost, getProfile, loadCatalog, resolveProfileName } from '../src/engine/catalog.js';

const catalog = loadCatalog();

test('four sellable profiles and the old names are aliases', () => {
  assert.deepEqual(Object.keys(catalog.profiles), ['ultra', 'high', 'medium', 'low']);
  assert.equal(resolveProfileName(catalog, 'Quality'), 'ultra');
  assert.equal(resolveProfileName(catalog, 'performance'), 'low');
});

test('rain, grain and chromatic aberration stay off in every preset', () => {
  for (const name of Object.keys(catalog.profiles)) {
    const profile = getProfile(catalog, name);
    const active = activeTechniques(catalog, profile);
    assert.equal(profile.effects.rain.enabled, false);
    assert.equal(profile.effects.grain.enabled, false);
    assert.equal(profile.effects.chromatic.enabled, false);
    assert.equal(active.includes('FGM_Rain'), false);
    assert.equal(active.includes('FGM_FilmGrain'), false);
    assert.equal(active.includes('FGM_ChromaticAberration'), false);
  }
});

test('low skips the expensive passes that ultra keeps', () => {
  const ultra = estimateCost(getProfile(catalog, 'ultra'));
  const low = estimateCost(getProfile(catalog, 'low'));
  assert.ok(ultra.samples > low.samples);
  assert.equal(getProfile(catalog, 'low').effects.bloom.enabled, false);
  assert.equal(getProfile(catalog, 'low').effects.reflections.enabled, false);
  assert.equal(getProfile(catalog, 'ultra').effects.bloom.enabled, true);
  assert.ok(getProfile(catalog, 'ultra').effects.bloom.taps > getProfile(catalog, 'high').effects.bloom.taps);
  assert.ok(getProfile(catalog, 'high').effects.bloom.taps > getProfile(catalog, 'medium').effects.bloom.taps);
});

test('road textures get smaller as the profile gets lighter', () => {
  const sizes = ['ultra', 'high', 'medium', 'low'].map((name) => getProfile(catalog, name).roads.size);
  assert.deepEqual(sizes, [2048, 1024, 512, 256]);
});

test('game settings stay inside the known safe key list', () => {
  const allowed = new Set(catalog.settingsApplied);
  for (const name of Object.keys(catalog.profiles)) {
    for (const key of Object.keys(getProfile(catalog, name).game)) {
      assert.equal(allowed.has(key), true, key);
    }
  }
  for (const forbidden of catalog.forbiddenWrites) {
    assert.equal(catalog.settingsApplied.includes(forbidden), false);
  }
});

test('ultra asks for the heavy settings and low stays modest', () => {
  const ultra = getProfile(catalog, 'ultra').game;
  const low = getProfile(catalog, 'low').game;
  assert.equal(ultra.AnisotropicFiltering, 16);
  assert.equal(ultra.TextureQuality, 3);
  assert.ok(low.ShadowQuality < ultra.ShadowQuality);
  assert.ok(low.ReflectionQuality < ultra.ReflectionQuality);
  assert.ok(low.AnisotropicFiltering < ultra.AnisotropicFiltering);
  assert.ok(low.PostFX >= 1);
});
