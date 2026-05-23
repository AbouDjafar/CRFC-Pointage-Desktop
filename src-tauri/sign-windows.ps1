param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$TargetFile
)

$certificateBase64 = $env:WINDOWS_CERTIFICATE
$certificatePassword = $env:WINDOWS_CERTIFICATE_PASSWORD
$timestampUrl = if ($env:WINDOWS_TIMESTAMP_URL) { $env:WINDOWS_TIMESTAMP_URL } else { 'http://timestamp.digicert.com' }

if ([string]::IsNullOrWhiteSpace($certificateBase64) -or [string]::IsNullOrWhiteSpace($certificatePassword)) {
  Write-Host "Windows signing skipped: certificate secrets are not configured."
  exit 0
}

$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$pfxPath = Join-Path $tempRoot 'crfc-pointage-signing.pfx'

if (-not (Test-Path $pfxPath)) {
  [System.IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($certificateBase64))
}

$signTool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter 'signtool.exe' |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if (-not $signTool) {
  throw 'signtool.exe introuvable sur le runner Windows.'
}

Write-Host "Signing $TargetFile with $($signTool.FullName)"

& $signTool.FullName sign /fd SHA256 /f $pfxPath /p $certificatePassword /tr $timestampUrl /td SHA256 $TargetFile

if ($LASTEXITCODE -ne 0) {
  throw "La signature numerique a echoue pour $TargetFile."
}
