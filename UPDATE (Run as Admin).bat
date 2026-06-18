@echo off
:: Auto-elevate to Administrator
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set PSScript=%TEMP%\vdi_install.ps1

echo $ErrorActionPreference = 'Stop' > "%PSScript%"
echo $scriptDir = '%~dp0' >> "%PSScript%"
echo Write-Host 'Closing Vivaldi...' >> "%PSScript%"
echo Stop-Process -Name vivaldi -Force -ErrorAction SilentlyContinue >> "%PSScript%"
echo Start-Sleep -Seconds 2 >> "%PSScript%"
echo $paths = @( 'C:\Program Files\Vivaldi\Application', 'C:\VivaldiBrowser\Application', "$env:LOCALAPPDATA\Vivaldi\Application" ) >> "%PSScript%"
echo $vivPath = $null >> "%PSScript%"
echo foreach ($p in $paths) { >> "%PSScript%"
echo   if (Test-Path $p) { >> "%PSScript%"
echo     $versions = Get-ChildItem -Path $p -Directory ^| Where-Object Name -match '^\d+\.\d+\.\d+\.\d+$' ^| Sort-Object Name -Descending >> "%PSScript%"
echo     if ($versions) { $vivPath = $versions[0].FullName; break } >> "%PSScript%"
echo   } >> "%PSScript%"
echo } >> "%PSScript%"
echo if (-not $vivPath) { Write-Host 'Could not find Vivaldi installation.'; pause; exit } >> "%PSScript%"
echo $windowHtml = Join-Path $vivPath 'resources\vivaldi\window.html' >> "%PSScript%"
echo if (-not (Test-Path $windowHtml)) { Write-Host 'Could not find window.html.'; pause; exit } >> "%PSScript%"
echo $html = Get-Content $windowHtml -Raw >> "%PSScript%"
echo if ($html -notmatch '^<script src=''dynamic-island\.js''^>^</script^>') { >> "%PSScript%"
echo   $html = $html -replace '^</body^>', '^<script src=''dynamic-island.js''^>^</script^>^</body^>' >> "%PSScript%"
echo   $utf8NoBom = New-Object System.Text.UTF8Encoding $False >> "%PSScript%"
echo   [System.IO.File]::WriteAllText($windowHtml, $html, $utf8NoBom) >> "%PSScript%"
echo   Write-Host 'Patched window.html successfully.' >> "%PSScript%"
echo } else { Write-Host 'Already patched.' } >> "%PSScript%"
echo $destScript = Join-Path $vivPath 'resources\vivaldi\dynamic-island.js' >> "%PSScript%"
echo Copy-Item (Join-Path $scriptDir 'dynamic-island.js') -Destination $destScript -Force >> "%PSScript%"
echo Write-Host 'Copied script.' >> "%PSScript%"
echo Write-Host 'Restarting Vivaldi...' >> "%PSScript%"
echo $vivaldiExe = Join-Path (Split-Path $vivPath) 'vivaldi.exe' >> "%PSScript%"
echo Start-Process 'explorer.exe' $vivaldiExe >> "%PSScript%"
echo Write-Host 'Done!' >> "%PSScript%"
echo Start-Sleep -Seconds 2 >> "%PSScript%"

powershell -ExecutionPolicy Bypass -File "%PSScript%"
del "%PSScript%"

