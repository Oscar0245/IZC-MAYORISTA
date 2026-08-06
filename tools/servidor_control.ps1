# Control del servidor local IZC (inicio, reinicio y comprobacion de API).
param(
  [ValidateSet('ensure', 'restart', 'stop', 'health')]
  [string]$Action = 'ensure'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $ScriptDir '..')).Path
$ServerScript = Join-Path $ScriptDir 'servidor_local.ps1'
$SigFile = Join-Path $ScriptDir '.servidor_local.sig'
$Port = 8080

function Get-ServerSignature {
  if (-not (Test-Path $ServerScript)) { return '' }
  $file = Get-Item $ServerScript
  return ($file.LastWriteTimeUtc.Ticks.ToString() + ':' + $file.Length.ToString())
}

function Save-ServerSignature {
  $sig = Get-ServerSignature
  [System.IO.File]::WriteAllText($SigFile, $sig, [System.Text.UTF8Encoding]::new($false))
}

function Test-ServerListening {
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    return ($null -ne $conn)
  } catch {
    return $false
  }
}

function Stop-Server8080 {
  $pids = @()
  try {
    $pids = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    $pids = @()
  }
  foreach ($procId in $pids) {
    if ($procId) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Start-ServerBackground {
  Start-Process powershell -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ServerScript,
    '-NoBrowser'
  ) -WindowStyle Hidden | Out-Null
}

function Test-ServerTrmApi {
  try {
    $body = '{"action":"get_trm"}'
    $response = Invoke-WebRequest -UseBasicParsing `
      -Uri "http://127.0.0.1:$Port/api/auth" `
      -Method POST `
      -ContentType 'application/json' `
      -Body $body `
      -TimeoutSec 2
    if ($response.StatusCode -ne 200) { return $false }
    $json = $response.Content | ConvertFrom-Json
    return ($json.ok -eq $true)
  } catch {
    return $false
  }
}

function Wait-ServerReady {
  param([int]$MaxAttempts = 12)
  for ($i = 0; $i -lt $MaxAttempts; $i++) {
    if ((Test-ServerListening) -and (Test-ServerTrmApi)) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Test-ServerUpToDate {
  if (-not (Test-ServerListening)) { return $false }
  if (-not (Test-ServerTrmApi)) { return $false }
  $current = Get-ServerSignature
  if (-not (Test-Path $SigFile)) { return $false }
  $saved = (Get-Content $SigFile -Raw -Encoding UTF8).Trim()
  return ($saved -eq $current)
}

function Start-Or-RestartServer {
  Stop-Server8080
  Start-Sleep -Seconds 2
  Start-ServerBackground
  if (Wait-ServerReady) {
    Save-ServerSignature
    return $true
  }
  return $false
}

switch ($Action) {
  'stop' {
    Stop-Server8080
    exit 0
  }
  'health' {
    if (Test-ServerUpToDate) { exit 0 } else { exit 1 }
  }
  'restart' {
    if (Start-Or-RestartServer) { exit 0 } else { exit 1 }
  }
  'ensure' {
    if (Test-ServerUpToDate) { exit 0 }
    if (Start-Or-RestartServer) { exit 0 } else { exit 1 }
  }
}
