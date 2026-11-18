@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo MK Rewind - Preparar bloqueio de anuncios de video VAFT
echo O script sera baixado SOMENTE do Github do ryanbr e verificado por SHA-1 Git.
echo Nenhum programa sera instalado. Confira preparar-vaft.ps1 antes de executar.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0preparar-vaft.ps1"
echo.
pause
