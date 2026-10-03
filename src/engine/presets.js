import { activeTechniques, getProfile } from './catalog.js';

const FILE = 'FGM.fx';

const INTEGER_KEYS = new Set(['ClearTaps', 'ReflectTaps', 'BloomTaps']);

function formatValue(key, value) {
  if (INTEGER_KEYS.has(key)) return String(Math.round(value));
  return Number(value).toFixed(6);
}

export function presetFileName(profileName) {
  const title = profileName.charAt(0).toUpperCase() + profileName.slice(1);
  return `FGM-${title}.ini`;
}

export function profileFolder(profileName) {
  return profileName.charAt(0).toUpperCase() + profileName.slice(1);
}

export function renderPreset(catalog, profileName) {
  const profile = getProfile(catalog, profileName);
  const active = activeTechniques(catalog, profile);
  const line = active.map((name) => `${name}@${FILE}`).join(',');
  const fx = profile.effects;
  const uniforms = {
    ExposureBias: fx.exposure.bias,
    HighlightStart: fx.highlight.start,
    HighlightStrength: fx.highlight.strength,
    TonemapStrength: fx.tonemap.strength,
    ShadowLift: fx.shadows.lift,
    ClearDay: fx.clearview.day,
    ClearNight: fx.clearview.night,
    ClearTaps: fx.clearview.taps,
    LampStrength: fx.lamps.strength,
    ReflectStrength: fx.reflections.strength,
    ReflectTaps: fx.reflections.taps,
    RoadStrength: fx.road.strength,
    BloomThreshold: fx.bloom.threshold,
    BloomIntensity: fx.bloom.intensity,
    BloomTaps: fx.bloom.taps,
    DaySat: fx.day.sat,
    DayHighlight: fx.day.highlight,
    NightLift: fx.night.blackLift,
    NightHaze: fx.night.haze,
    ContrastAmount: fx.contrast.amount,
    ColorVibrance: fx.color.vibrance,
    ColorVegCap: fx.color.vegCap,
    LutMix: fx.lut.mix,
    AmbientDay: fx.ambient.day,
    AmbientNight: fx.ambient.night,
    ProtectCeiling: fx.protection.ceiling,
    SharpAmount: fx.sharp.amount,
    VignetteAmount: fx.vignette.amount,
    GrainAmount: fx.grain.amount,
    ChromaAmount: fx.chromatic.amount,
    RainAmount: fx.rain.amount,
    RainDrops: fx.rain.drops,
  };
  const keys = Object.entries(uniforms)
    .map(([key, value]) => `${key}=${formatValue(key, value)}`)
    .join('\n');
  return [
    `Techniques=${line}`,
    `TechniqueSorting=${line}`,
    '',
    `[${FILE}]`,
    keys,
    '',
  ].join('\n');
}
