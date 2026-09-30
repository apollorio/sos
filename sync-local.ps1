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
# ASCII markers only (Windows PowerShell 5.1 reads this file as ANSI). Q_FEEL = the discreet body question (audit 014).
$feel  = Select-String -Path $sim -Pattern "Q_FEEL" -List
if ($stamp -and $feel) { Write-Host "OK: simulator.html is the current build (engine version in the header; discovery starts with the body question)." -ForegroundColor Green }
else { Write-Host "STALE: simulator.html is an old build. Run this script again and check the git output above." -ForegroundColor Red }
Write-Host "Open:  $PSScriptRoot\$sim  (Ctrl+F5 in the browser)"
if (Test-Path "app\local.html") { Write-Host "Open:  $PSScriptRoot\app\local.html  (double-click: runs straight from disk; Ctrl+H opens the lab panel)" -ForegroundColor Green }
else { Write-Host "MISSING: app\local.html (old checkout?). Run this script again." -ForegroundColor Red }
Write-Host "Open:  $PSScriptRoot\app\index.html  (through a local server, e.g. 'npx serve .' in this folder, then /app/)"
