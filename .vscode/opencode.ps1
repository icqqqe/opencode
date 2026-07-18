[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); chcp 65001 > $null;

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$action = if ($args.Count -gt 0) { [string]$args[0] } else { "PrepareProdDebug" }
$allowedActions = @("Install", "Dev", "Build", "BuildProdDebug", "PrepareProdDebug", "PackageWin")
if ($action -notin $allowedActions) {
  throw "Unknown action '$action'. Expected one of: $($allowedActions -join ', ')."
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$desktopRoot = Join-Path $repoRoot "packages\desktop"

function Get-WorkingBun {
  $candidates = [System.Collections.Generic.List[string]]::new()
  $command = Get-Command "bun.exe" -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    $candidates.Add($command.Source)
  }

  if ($env:BUN_LINKS_PATH) {
    $candidates.Add((Join-Path $env:BUN_LINKS_PATH "bun.exe"))
  }

  if ($env:USERPROFILE) {
    $candidates.Add((Join-Path $env:USERPROFILE ".bun\bin\bun.exe"))
  }

  if ($env:LOCALAPPDATA) {
    $candidates.Add((Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\bun.exe"))
    $packages = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $packages) {
      Get-ChildItem -LiteralPath $packages -Directory -Filter "Oven-sh.Bun_*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object {
          Get-ChildItem -LiteralPath $_.FullName -File -Recurse -Filter "bun.exe" -ErrorAction SilentlyContinue |
            ForEach-Object { $candidates.Add($_.FullName) }
        }
    }
  }

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      continue
    }

    try {
      $version = (& $candidate "--version" 2>$null | Select-Object -First 1)
      if ($LASTEXITCODE -eq 0 -and $version) {
        return [PSCustomObject]@{
          Path = (Resolve-Path -LiteralPath $candidate).Path
          Version = [string]$version
        }
      }
    }
    catch {
      continue
    }
  }

  return $null
}

function Resolve-Bun {
  $result = Get-WorkingBun
  if ($result) {
    return $result
  }

  $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "Bun is not installed and WinGet is unavailable. Install Bun, reopen VSCode, and press F5 again."
  }

  Write-Host "Bun was not found. Installing it with WinGet..."
  & $winget.Source install -e --id Oven-sh.Bun --accept-source-agreements --accept-package-agreements | Out-Host
  $wingetExitCode = $LASTEXITCODE
  $result = Get-WorkingBun
  if ($result) {
    return $result
  }

  throw "WinGet could not provide a working Bun executable (exit code $wingetExitCode)."
}

function Invoke-Bun {
  param(
    [string]$WorkingDirectory,
    [string[]]$BunArguments
  )

  Push-Location -LiteralPath $WorkingDirectory
  try {
    & $script:bunExecutable @BunArguments
    if ($LASTEXITCODE -ne 0) {
      throw "Bun command failed with exit code $LASTEXITCODE`: bun $($BunArguments -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

function Install-Dependencies {
  $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
  $env:npm_config_electron_mirror = "https://npmmirror.com/mirrors/electron/"
  Invoke-Bun -WorkingDirectory $repoRoot -BunArguments @("install")

  $electronRoot = Join-Path $desktopRoot "node_modules\electron"
  $electronInstall = Join-Path $electronRoot "install.js"
  $electronBinary = Join-Path $electronRoot "dist\electron.exe"
  if (-not (Test-Path -LiteralPath $electronBinary -PathType Leaf)) {
    if (-not (Test-Path -LiteralPath $electronInstall -PathType Leaf)) {
      throw "Electron install.js is missing after bun install."
    }
    Invoke-Bun -WorkingDirectory $electronRoot -BunArguments @($electronInstall)
  }

  if (-not (Test-Path -LiteralPath $electronBinary -PathType Leaf)) {
    throw "Electron binary is missing after dependency installation."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $desktopRoot "node_modules\.bin\electron.exe") -PathType Leaf)) {
    throw "The Electron launcher required by .vscode/launch.json is missing."
  }
}

function Build-Desktop {
  param([switch]$ProdDebug)

  if ($ProdDebug) {
    $env:OPENCODE_CHANNEL = "prod"
    Invoke-Bun -WorkingDirectory $desktopRoot -BunArguments @("run", "build", "--sourcemap")
    return
  }

  Invoke-Bun -WorkingDirectory $desktopRoot -BunArguments @("run", "build")
}

$bun = Resolve-Bun
$script:bunExecutable = $bun.Path
Write-Host "Using Bun $($bun.Version) from $($bun.Path)"

switch ($action) {
  "Install" {
    Install-Dependencies
  }
  "Dev" {
    Invoke-Bun -WorkingDirectory $repoRoot -BunArguments @("dev:desktop")
  }
  "Build" {
    Build-Desktop
  }
  "BuildProdDebug" {
    Build-Desktop -ProdDebug
  }
  "PrepareProdDebug" {
    Install-Dependencies
    Build-Desktop -ProdDebug
  }
  "PackageWin" {
    $env:OPENCODE_CHANNEL = "prod"
    Invoke-Bun -WorkingDirectory $desktopRoot -BunArguments @("run", "package:win")
  }
}
