import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';

const pwsh = ['/home/ubuntu/pwsh/pwsh', 'pwsh', 'powershell'].find((candidate) => {
  if (candidate.startsWith('/')) return existsSync(candidate);
  const probe = spawnSync(candidate, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
  return probe.status === 0;
});

const packageRoot = join(process.cwd(), 'release', 'FGM-v2.0.0');

function run(args) {
  const result = spawnSync(pwsh, ['-NoProfile', '-File', join(process.cwd(), 'installer', 'FGM-Install.ps1'), ...args], {
    encoding: 'utf8',
  });
  return result;
}

function sha(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function settingsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Settings>
  <graphics>
    <TextureQuality value="1" />
    <ShaderQuality value="1" />
    <ShadowQuality value="1" />
    <ReflectionQuality value="1" />
    <ParticleQuality value="1" />
    <GrassQuality value="1" />
    <PostFX value="1" />
    <AnisotropicFiltering value="4" />
    <SSAO value="0" />
    <LodScale value="0.500000" />
    <Shadow_SoftShadows value="3" />
    <DX_Version value="2" />
  </graphics>
</Settings>
`;
}

test('installer installs one profile, switches, repairs and restores', { skip: !pwsh || !existsSync(packageRoot) }, () => {
  const root = join(tmpdir(), `fgm-install-${Date.now()}`);
  const fivem = join(root, 'FiveM', 'FiveM.app');
  const docs = join(root, 'Documents');
  const state = join(root, 'state');
  const settings = join(docs, 'Rockstar Games', 'GTA V', 'settings.xml');
  mkdirSync(fivem, { recursive: true });
  mkdirSync(join(docs, 'Rockstar Games', 'GTA V'), { recursive: true });
  writeFileSync(join(fivem, 'FiveM.exe'), 'fake-fivem');
  writeFileSync(join(fivem, 'GTA5.exe'), 'fake-gta');
  writeFileSync(join(fivem, 'update.rpf'), 'fake-rpf');
  writeFileSync(join(fivem, 'CitizenFX.ini'), 'protected=1\n');
  writeFileSync(join(fivem, 'notes.txt'), 'keep me');
  writeFileSync(join(fivem, 'ReShade.ini'), '[GENERAL]\nEffectSearchPaths=.\\reshade-shaders\\Shaders\\**\nTextureSearchPaths=.\\reshade-shaders\\Textures\\**\nPresetPath=.\\ReShadePreset.ini\n');
  writeFileSync(settings, settingsXml());
  const before = {
    fivem: sha(join(fivem, 'FiveM.exe')),
    gta: sha(join(fivem, 'GTA5.exe')),
    rpf: sha(join(fivem, 'update.rpf')),
    citizen: sha(join(fivem, 'CitizenFX.ini')),
    settings: sha(settings),
  };
  const common = ['-FiveMRoot', fivem, '-DocumentsRoot', docs, '-StateRoot', state, '-PackageRoot', packageRoot, '-SkipDownload'];

  const ultra = run(['-Action', 'install', '-Profile', 'ultra', ...common]);
  assert.equal(ultra.status, 0, ultra.stderr || ultra.stdout);
  assert.match(readFileSync(settings, 'utf8'), /TextureQuality value="3"/);
  assert.match(readFileSync(settings, 'utf8'), /DX_Version value="2"/);
  assert.match(readFileSync(settings, 'utf8'), /Shadow_SoftShadows value="3"/);
  assert.match(readFileSync(join(fivem, 'ReShade.ini'), 'utf8'), /FGM-Ultra\.ini/);
  const road = PNG.sync.read(readFileSync(join(fivem, 'reshade-shaders', 'Textures', 'FGM_RoadAlbedo.png')));
  assert.equal(road.width, 2048);
  assert.equal(readFileSync(join(fivem, 'notes.txt'), 'utf8'), 'keep me');
  assert.equal(existsSync(join(docs, 'Rockstar Games', 'GTA V Enhanced', 'settings.xml')), false);
  assert.equal(sha(join(fivem, 'FiveM.exe')), before.fivem);
  assert.equal(sha(join(fivem, 'GTA5.exe')), before.gta);
  assert.equal(sha(join(fivem, 'update.rpf')), before.rpf);
  assert.equal(sha(join(fivem, 'CitizenFX.ini')), before.citizen);

  const sentinel = join(fivem, 'reshade-shaders', 'Shaders', 'FGM_Old.fx');
  writeFileSync(sentinel, 'old');
  const manifestPath = join(state, 'installed-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.installedFiles.push(sentinel);
  writeFileSync(manifestPath, JSON.stringify(manifest));
  writeFileSync(join(fivem, 'reshade-shaders', 'Shaders', 'user-extra.fx'), 'user');

  const low = run(['-Action', 'install', '-Profile', 'low', ...common]);
  assert.equal(low.status, 0, low.stderr || low.stdout);
  assert.match(readFileSync(settings, 'utf8'), /TextureQuality value="1"/);
  assert.match(readFileSync(settings, 'utf8'), /AnisotropicFiltering value="4"/);
  assert.equal(existsSync(sentinel), false);
  assert.equal(readFileSync(join(fivem, 'reshade-shaders', 'Shaders', 'user-extra.fx'), 'utf8'), 'user');
  assert.equal(existsSync(join(fivem, 'reshade-shaders', 'Presets', 'FGM-Ultra.ini')), false);
  assert.equal(existsSync(join(fivem, 'reshade-shaders', 'Presets', 'FGM-Low.ini')), true);
  const lowRoad = PNG.sync.read(readFileSync(join(fivem, 'reshade-shaders', 'Textures', 'FGM_RoadAlbedo.png')));
  assert.equal(lowRoad.width, 256);

  rmSync(join(fivem, 'reshade-shaders', 'Shaders', 'FGM.fx'));
  const repair = run(['-Action', 'repair', ...common]);
  assert.equal(repair.status, 0, repair.stderr || repair.stdout);
  assert.equal(statSync(join(fivem, 'reshade-shaders', 'Shaders', 'FGM.fx')).isFile(), true);
  assert.match(readFileSync(join(state, 'installed-manifest.json'), 'utf8'), /"profile": "low"/);

  const removed = run(['-Action', 'uninstall', ...common]);
  assert.equal(removed.status, 0, removed.stderr || removed.stdout);
  assert.equal(sha(settings), before.settings);
  assert.match(readFileSync(join(fivem, 'ReShade.ini'), 'utf8'), /ReShadePreset\.ini/);
  assert.equal(existsSync(join(fivem, 'reshade-shaders', 'Shaders', 'FGM.fx')), false);
  assert.equal(readFileSync(join(fivem, 'notes.txt'), 'utf8'), 'keep me');
  assert.equal(sha(join(fivem, 'FiveM.exe')), before.fivem);
  rmSync(root, { recursive: true, force: true });
});

test('installer refuses a bad ReShade hash and a missing FiveM folder', { skip: !pwsh }, () => {
  const root = join(tmpdir(), `fgm-hash-${Date.now()}`);
  const fivem = join(root, 'FiveM.app');
  mkdirSync(fivem, { recursive: true });
  writeFileSync(join(fivem, 'FiveM.exe'), 'fake-fivem');
  const fakeSetup = join(root, 'setup.exe');
  writeFileSync(fakeSetup, 'not-reshade');
  const bad = run([
    '-Action', 'install', '-Profile', 'low',
    '-FiveMRoot', fivem,
    '-DocumentsRoot', join(root, 'docs'),
    '-StateRoot', join(root, 'state'),
    '-PackageRoot', packageRoot,
    '-ReShadeInstaller', fakeSetup,
    '-SkipLaunch',
  ]);
  assert.equal(bad.status, 3, bad.stdout + bad.stderr);
  assert.equal(existsSync(join(fivem, 'dxgi.dll')), false);
  assert.equal(readFileSync(join(fivem, 'FiveM.exe'), 'utf8'), 'fake-fivem');

  const hash = createHash('sha256').update(readFileSync(fakeSetup)).digest('hex');
  const gui = run([
    '-Action', 'install', '-Profile', 'low',
    '-FiveMRoot', fivem,
    '-DocumentsRoot', join(root, 'docs'),
    '-StateRoot', join(root, 'state'),
    '-PackageRoot', packageRoot,
    '-ReShadeInstaller', fakeSetup,
    '-ReShadeSha256', hash,
    '-SkipLaunch',
  ]);
  assert.equal(gui.status, 0, gui.stderr || gui.stdout);
  assert.match(gui.stdout, /RESHAPE_GUI/);
  assert.equal(existsSync(join(fivem, 'dxgi.dll')), false);
  assert.equal(existsSync(join(fivem, 'reshade-shaders', 'Shaders', 'FGM.fx')), false);

  const missing = run(['-Action', 'install', '-Profile', 'low', '-FiveMRoot', join(root, 'missing'), '-StateRoot', join(root, 'state2'), '-PackageRoot', packageRoot, '-SkipDownload']);
  assert.equal(missing.status, 2);
  rmSync(root, { recursive: true, force: true });
});
