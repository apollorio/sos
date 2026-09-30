# Sync THIS folder to the latest cloud work (branch claude/connect-i913l0) and prove it is current.
# Run in PowerShell:  powershell -ExecutionPolicy Bypass -File .\sync-local.ps1
# WARNING: `reset --hard` discards local changes in this folder (that is the point: an exact copy of the cloud).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
git fetch origin claude/connect-i913l0
git checkout claude/connect-i913l0
git reset --hard origin/claude/connect-i913l0
Write-Host ""
Write-Host "Commit:" (git log --oneline -1)
$sim = "app\_system\dist\simulator.html"
$stamp = Select-String -Path $sim -Pattern "build-stamp" -List
$hold  = Select-String -Path $sim -Pattern "CARD_STEADY_CHECK|check_later|CHIP_REPORT_WORSE" -List
if ($stamp -and -not $hold) { Write-Host "OK: simulator.html is the current build (shows 'versão do motor' in the header)." -ForegroundColor Green }
else { Write-Host "STALE: simulator.html is an old build. Run this script again and check the git output above." -ForegroundColor Red }
Write-Host "Open:  $PSScriptRoot\$sim  (Ctrl+F5 in the browser)"
Write-Host "Open:  $PSScriptRoot\app\index.html  (through a local server, or the gateway)"
