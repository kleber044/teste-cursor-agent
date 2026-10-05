import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { estimateCost, loadCatalog } from '../src/engine/catalog.js';
import { bakeLut } from '../src/engine/lut.js';
import { drawLabel, renderScene, SCENE_NAMES } from '../src/engine/scenes.js';
import { bakeRoad } from '../src/engine/roads.js';
import { presetFileName, profileFolder, renderPreset } from '../src/engine/presets.js';
import { gradeImage } from '../src/engine/pipeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = join(root, 'release', 'FGM-v2.0.0');
const distRoot = join(root, 'dist');
const artifactRoot = '/opt/cursor/artifacts/fgm-v2-previews';

const COMPARISONS = [
  ['day', 'day-city', {}],
  ['night', 'night-lamps', { timeOfDay: 'night' }],
  ['road', 'day-asphalt', { timeOfDay: 'day' }],
  ['vegetation', 'day-vegetation', { timeOfDay: 'day' }],
  ['streetlight', 'night-lamps', { timeOfDay: 'night' }],
  ['rain', 'rain', { timeOfDay: 'night', forceRain: true }],
  ['distant-city', 'distance', { timeOfDay: 'day' }],
];

function ensure(dir) {
  mkdirSync(dir, { recursive: true });
}

function writePng(file, width, height, rgb, channels = 3) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    const o = i * channels;
    png.data[i * 4] = rgb[o];
    png.data[i * 4 + 1] = rgb[o + 1];
    png.data[i * 4 + 2] = rgb[o + 2];
    png.data[i * 4 + 3] = 255;
  }
  ensure(dirname(file));
  writeFileSync(file, PNG.sync.write(png));
}

function floatToPng(file, image) {
  const rgb = new Uint8ClampedArray(image.width * image.height * 3);
  for (let i = 0; i < image.data.length; i += 1) {
    rgb[i] = Math.round(Math.min(1, Math.max(0, image.data[i])) * 255);
  }
  writePng(file, image.width, image.height, rgb, 3);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function copyInto(src, dest) {
  ensure(dirname(dest));
  copyFileSync(src, dest);
}

const catalog = loadCatalog();
rmSync(distRoot, { recursive: true, force: true });
rmSync(releaseRoot, { recursive: true, force: true });
ensure(distRoot);
ensure(releaseRoot);

const lut = bakeLut();
const costs = {};

for (const name of Object.keys(catalog.profiles)) {
  const folder = profileFolder(name);
  const size = catalog.profiles[name].roads.size;
  process.stdout.write(`road ${name} ${size}\n`);
  const road = bakeRoad(size);
  const roadTargets = [
    join(root, 'src', 'roads', `FGM_RoadAlbedo_${size}.png`),
    join(distRoot, name, 'roads', 'FGM_RoadAlbedo.png'),
    join(releaseRoot, folder, 'roads', 'FGM_RoadAlbedo.png'),
    join(releaseRoot, folder, 'Textures', 'FGM_RoadAlbedo.png'),
  ];
  for (const target of roadTargets) writePng(target, road.width, road.height, road.data);
  writePng(join(releaseRoot, folder, 'Textures', 'FGM_Lut.png'), lut.width, lut.height, lut.data);
  writePng(join(distRoot, name, 'FGM_Lut.png'), lut.width, lut.height, lut.data);

  const shaderDir = join(releaseRoot, folder, 'Shaders');
  ensure(shaderDir);
  copyInto(join(root, 'src', 'shaders', 'FGM.fx'), join(shaderDir, 'FGM.fx'));
  copyInto(join(root, 'src', 'shaders', 'FGM.fxh'), join(shaderDir, 'FGM.fxh'));
  copyInto(join(root, 'src', 'shaders', 'FGM.fx'), join(distRoot, name, 'Shaders', 'FGM.fx'));
  copyInto(join(root, 'src', 'shaders', 'FGM.fxh'), join(distRoot, name, 'Shaders', 'FGM.fxh'));

  const preset = renderPreset(catalog, name);
  writeFileSync(join(releaseRoot, folder, presetFileName(name)), preset);
  writeFileSync(join(distRoot, name, presetFileName(name)), preset);
  costs[name] = estimateCost(catalog.profiles[name]);
}

writeFileSync(join(distRoot, 'custos.json'), JSON.stringify(costs, null, 2));

const labels = ['OFF', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
const order = ['off', 'low', 'medium', 'high', 'ultra'];
const previewDir = join(releaseRoot, 'Previews');
ensure(previewDir);
if (existsSync('/opt/cursor/artifacts')) ensure(artifactRoot);

for (const sceneName of SCENE_NAMES) {
  const scene = renderScene(sceneName, 320, 180);
  const graded = gradeImage(scene, 'ultra', { timeOfDay: sceneName.startsWith('night') || sceneName === 'rain' || sceneName === 'movement' ? 'night' : 'day' });
  floatToPng(join(previewDir, 'subjects', `${sceneName}-off.png`), scene);
  floatToPng(join(previewDir, 'subjects', `${sceneName}-ultra.png`), graded);
}

for (const [label, sceneName, options] of COMPARISONS) {
  const scene = renderScene(sceneName, 320, 180);
  const panels = order.map((profile) => gradeImage(scene, profile, options));
  const width = 320 * panels.length;
  const height = 196;
  const sheet = { width, height, data: new Float32Array(width * height * 3) };
  for (let i = 0; i < width * 16; i += 1) {
    sheet.data[i * 3] = 0.93;
    sheet.data[i * 3 + 1] = 0.93;
    sheet.data[i * 3 + 2] = 0.91;
  }
  panels.forEach((panel, index) => {
    for (let y = 0; y < 180; y += 1) {
      for (let x = 0; x < 320; x += 1) {
        const src = (y * 320 + x) * 3;
        const dst = ((y + 16) * width + index * 320 + x) * 3;
        sheet.data[dst] = panel.data[src];
        sheet.data[dst + 1] = panel.data[src + 1];
        sheet.data[dst + 2] = panel.data[src + 2];
      }
    }
    drawLabel(sheet, labels[index], index * 320 + 8, 2, 2);
  });
  floatToPng(join(previewDir, `compare-${label}.png`), sheet);
  if (existsSync(artifactRoot)) floatToPng(join(artifactRoot, `compare-${label}.png`), sheet);
}

const docs = join(root, 'docs');
const releaseDocs = join(releaseRoot, 'Docs');
ensure(releaseDocs);
if (existsSync(docs)) {
  for (const file of readdirSync(docs)) {
    if (file.endsWith('.md')) copyInto(join(docs, file), join(releaseDocs, file));
  }
}
copyInto(join(root, 'README.md'), join(releaseDocs, 'README.md'));

const licenses = join(releaseRoot, 'Licenses');
ensure(licenses);
writeFileSync(join(licenses, 'FGM.txt'), readFileSync(join(root, 'licenses', 'FGM.txt')));
writeFileSync(join(licenses, 'ReShade-BSD-3-Clause.txt'), readFileSync(join(root, 'licenses', 'ReShade-BSD-3-Clause.txt')));
writeFileSync(join(licenses, 'pngjs-MIT.txt'), readFileSync(join(root, 'licenses', 'pngjs-MIT.txt')));

const installerDest = join(releaseRoot, 'Installer');
ensure(installerDest);
copyInto(join(root, 'installer', 'FGM-Install.ps1'), join(installerDest, 'FGM-Install.ps1'));
copyInto(join(root, 'src', 'profiles', 'profiles.json'), join(installerDest, 'profiles.json'));
for (const cmd of ['Instalar-Ultra.cmd', 'Instalar-High.cmd', 'Instalar-Medium.cmd', 'Instalar-Low.cmd', 'Desinstalar.cmd', 'Reparar.cmd']) {
  const text = readFileSync(join(root, 'installer', cmd), 'utf8').replaceAll('%~dp0FGM-Install.ps1', '%~dp0Installer\\FGM-Install.ps1');
  writeFileSync(join(releaseRoot, cmd), text.replaceAll('\n', '\r\n'));
  writeFileSync(join(installerDest, cmd), readFileSync(join(root, 'installer', cmd), 'utf8').replaceAll('\n', '\r\n'));
}

const sums = walk(releaseRoot)
  .filter((file) => !file.endsWith('SHA256SUMS.txt'))
  .sort()
  .map((file) => {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    return `${hash}  ${relative(releaseRoot, file).split('\\').join('/')}`;
  })
  .join('\n');
writeFileSync(join(releaseRoot, 'SHA256SUMS.txt'), `${sums}\n`);
console.log(`release ${releaseRoot}`);
