#Requires -Version 5.1
[CmdletBinding()]
param(
  [ValidateSet('install', 'uninstall', 'repair')]
  [string]$Action = 'install',
  [ValidateSet('ultra', 'high', 'medium', 'low')]
  [string]$Profile = 'high',
  [string]$PackageRoot = '',
  [string]$FiveMRoot = '',
  [string]$DocumentsRoot = '',
  [string]$StateRoot = '',
  [string]$ReShadeUrl = 'https://reshade.me/downloads/ReShade_Setup_6.8.0.exe',
  [string]$ReShadeSha256 = '207aea16205fbf952bc8fe1879966672454cf04002e7ad34237c7990a5b3c0b4',
  [string]$ReShadeInstaller = '',
  [switch]$DryRun,
  [switch]$SkipDownload,
  [switch]$SkipLaunch
)

$ErrorActionPreference = 'Stop'

$Forbidden = @('FiveM.exe', 'GTA5.exe', 'update.rpf', 'CitizenFX.ini')

function Write-Fgm([string]$Message) {
  Write-Output "FGM: $Message"
}

function Assert-SafePath([string]$Path) {
  $name = [System.IO.Path]::GetFileName($Path)
  if ($Forbidden -contains $name) {
    throw "FGM recusou escrever em arquivo protegido: $name"
  }
}

function Resolve-PackageRoot {
  if ($PackageRoot) { return (Resolve-Path $PackageRoot).Path }
  $parent = Split-Path $PSScriptRoot -Parent
  if (Test-Path (Join-Path $parent 'Ultra\FGM-Ultra.ini')) { return $parent }
  $release = Join-Path $parent 'release\FGM-v2.0.0'
  if (Test-Path (Join-Path $release 'Ultra\FGM-Ultra.ini')) { return $release }
  throw 'Pacote FGM não encontrado. Use -PackageRoot.'
}

function Resolve-StateRoot {
  if ($StateRoot) { return $StateRoot }
  if ($env:LOCALAPPDATA) { return (Join-Path $env:LOCALAPPDATA 'FGM') }
  return (Join-Path $HOME '.local/share/FGM')
}

function Resolve-FiveMRoot {
  if ($FiveMRoot) { return $FiveMRoot }
  if (-not $env:LOCALAPPDATA) { throw 'FiveM não encontrado. Informe -FiveMRoot.' }
  return (Join-Path $env:LOCALAPPDATA 'FiveM\FiveM.app')
}

function Resolve-DocumentsRoot {
  if ($DocumentsRoot) { return $DocumentsRoot }
  return [Environment]::GetFolderPath('MyDocuments')
}

function Get-Catalog {
  $candidates = @(
    (Join-Path $PSScriptRoot 'profiles.json'),
    (Join-Path (Split-Path $PSScriptRoot -Parent) 'src\profiles\profiles.json')
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) { return Get-Content -Raw -Path $path | ConvertFrom-Json }
  }
  throw 'profiles.json do FGM não encontrado.'
}

function Test-ReShadePresent([string]$Root) {
  return (Test-Path (Join-Path $Root 'ReShade.ini')) -or (Test-Path (Join-Path $Root 'dxgi.dll'))
}

function Ensure-ReShade([string]$Root, [string]$CacheRoot) {
  if (Test-ReShadePresent $Root) {
    Write-Fgm "ReShade já presente em $Root"
    return
  }
  if ($DryRun) {
    Write-Fgm "DRY ReShade ausente; o instalador oficial seria baixado de $ReShadeUrl"
    return
  }
  if ($SkipDownload -and -not $ReShadeInstaller) {
    throw 'ReShade não está instalado. Rode de novo sem -SkipDownload ou instale pelo site oficial.'
  }
  $file = $ReShadeInstaller
  if (-not $file) {
    $cache = Join-Path $CacheRoot 'cache'
    New-Item -ItemType Directory -Force -Path $cache | Out-Null
    $file = Join-Path $cache 'ReShade_Setup_6.8.0.exe'
    Write-Fgm "Baixando ReShade oficial"
    Invoke-WebRequest -Uri $ReShadeUrl -OutFile $file
  }
  $actual = (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLowerInvariant()
  if ($actual -ne $ReShadeSha256.ToLowerInvariant()) {
    Write-Fgm "SHA-256 do ReShade não confere. Esperado $ReShadeSha256, obtido $actual"
    exit 3
  }
  Write-Fgm "RESHAPE_GUI $file"
  if (-not $SkipLaunch) {
    Start-Process -FilePath $file
  }
  throw 'RESHADE_SETUP_REQUIRED'
}

function Copy-IfNew([string]$Source, [string]$Destination) {
  Assert-SafePath $Destination
  if ($DryRun) {
    Write-Fgm "DRY copy $Source -> $Destination"
    return $Destination
  }
  $dir = Split-Path $Destination -Parent
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Copy-Item -Force -Path $Source -Destination $Destination
  return $Destination
}

function Get-ProfileFiles([string]$Package, [string]$ProfileName) {
  $folder = $ProfileName.Substring(0, 1).ToUpperInvariant() + $ProfileName.Substring(1)
  $ini = "FGM-$folder.ini"
  $base = Join-Path $Package $folder
  $files = @()
  $files += Get-ChildItem -File (Join-Path $base 'Shaders')
  $files += Get-ChildItem -File (Join-Path $base 'Textures')
  $files += Get-Item (Join-Path $base $ini)
  return $files
}

function Install-ProfileFiles([string]$Package, [string]$ProfileName, [string]$FiveM, [string[]]$Previous) {
  $folder = $ProfileName.Substring(0, 1).ToUpperInvariant() + $ProfileName.Substring(1)
  $installed = @()
  $shaderDest = Join-Path $FiveM 'reshade-shaders\Shaders'
  $texDest = Join-Path $FiveM 'reshade-shaders\Textures'
  $presetDest = Join-Path $FiveM 'reshade-shaders\Presets'
  $base = Join-Path $Package $folder
  foreach ($file in (Get-ChildItem -File (Join-Path $base 'Shaders'))) {
    $installed += Copy-IfNew $file.FullName (Join-Path $shaderDest $file.Name)
  }
  foreach ($file in (Get-ChildItem -File (Join-Path $base 'Textures'))) {
    $installed += Copy-IfNew $file.FullName (Join-Path $texDest $file.Name)
  }
  $iniName = "FGM-$folder.ini"
  $installed += Copy-IfNew (Join-Path $base $iniName) (Join-Path $presetDest $iniName)
  $keep = @{}
  foreach ($path in $installed) { $keep[$path.ToLowerInvariant()] = $true }
  foreach ($old in $Previous) {
    if (-not $keep.ContainsKey($old.ToLowerInvariant()) -and (Test-Path $old)) {
      Assert-SafePath $old
      if ($DryRun) { Write-Fgm "DRY remove $old" }
      else { Remove-Item -Force $old }
    }
  }
  return $installed
}

function Update-ReShadeIni([string]$FiveM, [string]$PresetRelative, [string]$BackupDir) {
  $path = Join-Path $FiveM 'ReShade.ini'
  Assert-SafePath $path
  if (-not (Test-Path $path)) {
    if ($DryRun) { Write-Fgm "DRY create ReShade.ini"; return }
    @(
      '[GENERAL]'
      'EffectSearchPaths=.\reshade-shaders\Shaders\**'
      'TextureSearchPaths=.\reshade-shaders\Textures\**'
      "PresetPath=$PresetRelative"
    ) | Set-Content -Path $path -Encoding ASCII
    return
  }
  $backup = Join-Path $BackupDir 'original-ReShade.ini'
  if (-not (Test-Path $backup)) {
    if ($DryRun) { Write-Fgm "DRY backup ReShade.ini" }
    else {
      New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
      Copy-Item -Path $path -Destination $backup
    }
  }
  $text = Get-Content -Raw -Path $path
  $text = Set-IniValue $text 'PresetPath' $PresetRelative
  $text = Add-SearchPath $text 'EffectSearchPaths' '.\reshade-shaders\Shaders\**'
  $text = Add-SearchPath $text 'TextureSearchPaths' '.\reshade-shaders\Textures\**'
  if ($DryRun) { Write-Fgm "DRY update ReShade.ini"; return }
  Set-Content -Path $path -Value $text -Encoding ASCII
}

function Set-IniValue([string]$Text, [string]$Key, [string]$Value) {
  $pattern = "(?m)^$Key\s*=.*$"
  if ($Text -match $pattern) {
    return [regex]::Replace($Text, $pattern, "$Key=$Value")
  }
  if ($Text -notmatch '(?m)^\[GENERAL\]') { $Text = "[GENERAL]`r`n$Text" }
  return $Text -replace '(?m)^\[GENERAL\]\s*', "[GENERAL]`r`n$Key=$Value`r`n"
}

function Add-SearchPath([string]$Text, [string]$Key, [string]$Entry) {
  $pattern = "(?m)^$Key\s*=(.*)$"
  if ($Text -match $pattern) {
    $current = $Matches[1]
    if ($current -like "*reshade-shaders*") { return $Text }
    return [regex]::Replace($Text, $pattern, "$Key=$($Matches[1]),$Entry")
  }
  return Set-IniValue $Text $Key $Entry
}

function Update-GtaSettings([string]$Path, $Game, [string[]]$Allowed, [string]$BackupDir) {
  if (-not (Test-Path $Path)) {
    Write-Fgm "settings.xml ausente, recomendações não foram gravadas: $Path"
    return
  }
  Assert-SafePath $Path
  $leaf = Split-Path (Split-Path $Path -Parent) -Leaf
  $backupFile = Join-Path $BackupDir ("settings-" + $leaf + ".xml")
  $mapPath = Join-Path $BackupDir 'settings-map.json'
  $list = @()
  if (Test-Path $mapPath) { $list = @(Get-Content -Raw -Path $mapPath | ConvertFrom-Json) }
  $known = $false
  foreach ($item in $list) { if ($item.source -eq $Path) { $known = $true } }
  if (-not $known) {
    if ($DryRun) { Write-Fgm "DRY backup $Path" }
    else {
      New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
      Copy-Item -Path $Path -Destination $backupFile
      $list += [pscustomobject]@{ source = $Path; backup = $backupFile }
      ConvertTo-Json -InputObject @($list) -Depth 4 | Set-Content -Path $mapPath -Encoding UTF8
    }
  }
  elseif (-not $DryRun) {
    Copy-Item -Force -Path $backupFile -Destination $Path
  }
  if ($DryRun) {
    Write-Fgm "DRY apply settings $Path"
    return
  }
  $doc = New-Object System.Xml.XmlDocument
  $doc.PreserveWhitespace = $true
  $doc.Load($Path)
  foreach ($prop in $Game.PSObject.Properties) {
    if ($Allowed -notcontains $prop.Name) { throw "Chave fora da lista segura: $($prop.Name)" }
    $node = $doc.SelectSingleNode("//*[local-name()='$($prop.Name)']")
    if (-not $node -or -not $node.HasAttribute('value')) {
      Write-Fgm "Recomendação não aplicada (chave ausente): $($prop.Name)"
      continue
    }
    $node.SetAttribute('value', [string]$prop.Value)
  }
  $doc.Save($Path)
  Write-Fgm "Configuração gráfica aplicada em $Path"
}

function Restore-File([string]$Backup, [string]$Destination) {
  if (-not (Test-Path $Backup)) { return }
  Assert-SafePath $Destination
  if ($DryRun) { Write-Fgm "DRY restore $Destination"; return }
  Copy-Item -Force -Path $Backup -Destination $Destination
}

$package = Resolve-PackageRoot
$state = Resolve-StateRoot
$fivem = Resolve-FiveMRoot
$documents = Resolve-DocumentsRoot
$backupDir = Join-Path $state 'backups'
$manifestPath = Join-Path $state 'installed-manifest.json'
$catalog = Get-Catalog

if ($ReShadeUrl -match 'Addon') { throw 'FGM não baixa a build Addon do ReShade.' }
if (-not (Test-Path (Join-Path $fivem 'FiveM.exe'))) {
  Write-Fgm "FiveM não encontrado em $fivem"
  exit 2
}

$previous = @()
if (Test-Path $manifestPath) {
  $existing = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
  $previous = @($existing.installedFiles)
}

if ($Action -eq 'uninstall') {
  foreach ($file in $previous) {
    if (Test-Path $file) {
      Assert-SafePath $file
      if ($DryRun) { Write-Fgm "DRY remove $file" }
      else { Remove-Item -Force $file }
    }
  }
  $mapPath = Join-Path $backupDir 'settings-map.json'
  if (Test-Path $mapPath) {
    foreach ($item in @(Get-Content -Raw -Path $mapPath | ConvertFrom-Json)) {
      Restore-File $item.backup $item.source
    }
  }
  if ($existing -and $existing.createdReShadeIni) {
    $createdIni = Join-Path $fivem 'ReShade.ini'
    if ($DryRun) { Write-Fgm "DRY remove $createdIni" }
    elseif (Test-Path $createdIni) { Remove-Item -Force $createdIni }
  }
  else {
    Restore-File (Join-Path $backupDir 'original-ReShade.ini') (Join-Path $fivem 'ReShade.ini')
  }
  if (-not $DryRun -and (Test-Path $manifestPath)) { Remove-Item -Force $manifestPath }
  Write-Fgm 'Desinstalação concluída'
  exit 0
}

try {
  Ensure-ReShade $fivem $state
}
catch {
  if ($_.Exception.Message -eq 'RESHADE_SETUP_REQUIRED') { exit 0 }
  throw
}

if ($Action -eq 'repair' -and -not (Test-Path $manifestPath)) {
  throw 'Nada para reparar. Instale um perfil primeiro.'
}
if ($Action -eq 'repair') {
  $Profile = $existing.profile
}

$game = $catalog.profiles.$Profile.game
$allowed = @($catalog.settingsApplied)
$settings = @(
  (Join-Path $documents 'Rockstar Games\GTA V\settings.xml'),
  (Join-Path $documents 'Rockstar Games\GTA V Enhanced\settings.xml')
)
foreach ($settingsPath in $settings) {
  Update-GtaSettings $settingsPath $game $allowed $backupDir
}

$hadReShadeIni = Test-Path (Join-Path $fivem 'ReShade.ini')
$installed = Install-ProfileFiles $package $Profile $fivem $previous
$folder = $Profile.Substring(0, 1).ToUpperInvariant() + $Profile.Substring(1)
Update-ReShadeIni $fivem ".\reshade-shaders\Presets\FGM-$folder.ini" $backupDir

if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $state | Out-Null
  $manifest = [ordered]@{
    version = $catalog.version
    profile = $Profile
    installedFiles = $installed
    fiveMRoot = $fivem
    createdReShadeIni = (-not $hadReShadeIni)
  }
  $manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding UTF8
}
Write-Fgm "Perfil $Profile instalado"
exit 0
