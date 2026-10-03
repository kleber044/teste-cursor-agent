import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'profiles.json');

export function loadCatalog() {
  return JSON.parse(readFileSync(root, 'utf8'));
}

export function resolveProfileName(catalog, name) {
  const key = String(name || '').toLowerCase();
  if (catalog.profiles[key]) return key;
  if (catalog.aliases[key]) return catalog.aliases[key];
  throw new Error(`Perfil desconhecido: ${name}`);
}

export function getProfile(catalog, name) {
  return catalog.profiles[resolveProfileName(catalog, name)];
}

export function activeTechniques(catalog, profile) {
  const effects = profile.effects;
  const enabled = {
    FGM_Exposure: effects.exposure.enabled,
    FGM_HighlightRecovery: effects.highlight.enabled,
    FGM_Tonemap: effects.tonemap.enabled,
    FGM_Shadows: effects.shadows.enabled,
    FGM_ClearView: effects.clearview.enabled,
    FGM_Lamps: effects.lamps.enabled,
    FGM_ReflectionsEnhance: effects.reflections.enabled,
    FGM_Road: effects.road.enabled,
    FGM_Bloom: effects.bloom.enabled,
    FGM_Day: effects.day.enabled,
    FGM_Night: effects.night.enabled,
    FGM_Contrast: effects.contrast.enabled,
    FGM_Color: effects.color.enabled,
    FGM_Lut: effects.lut.enabled,
    FGM_AmbientTone: effects.ambient.enabled,
    FGM_ColorProtection: effects.protection.enabled,
    FGM_Sharp: effects.sharp.enabled,
    FGM_Vignette: effects.vignette.enabled,
    FGM_FilmGrain: effects.grain.enabled,
    FGM_ChromaticAberration: effects.chromatic.enabled,
    FGM_Rain: effects.rain.enabled,
  };
  return catalog.techniqueOrder.filter((name) => enabled[name]);
}

export function estimateCost(profile) {
  const fx = profile.effects;
  let passes = 0;
  let samples = 0;
  const add = (enabled, taps) => {
    if (!enabled) return;
    passes += 1;
    samples += taps;
  };
  add(fx.exposure.enabled, 17);
  add(fx.highlight.enabled, 1);
  add(fx.tonemap.enabled, 1);
  add(fx.shadows.enabled, 1);
  add(fx.clearview.enabled, 1 + fx.clearview.taps);
  add(fx.lamps.enabled, 1);
  add(fx.reflections.enabled, 1 + fx.reflections.taps);
  add(fx.road.enabled, 2);
  add(fx.bloom.enabled, 1 + fx.bloom.taps);
  add(fx.day.enabled, 17);
  add(fx.night.enabled, 17);
  add(fx.contrast.enabled, 1);
  add(fx.color.enabled, 1);
  add(fx.lut.enabled, 2);
  add(fx.ambient.enabled, 1);
  add(fx.protection.enabled, 1);
  add(fx.sharp.enabled, 5);
  add(fx.vignette.enabled, 1);
  add(fx.grain.enabled, 1);
  add(fx.chromatic.enabled, 3);
  add(fx.rain.enabled, 1);
  return { passes, samples };
}
