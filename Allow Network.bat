@echo off
title FileSharing - Allow network access
echo.
echo FileSharing - Windows Firewall setup
echo ====================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "EXE=%~dp0FileSharing.exe"
set "TOSS=%~dp0Toss.exe"
if not exist "%EXE%" (
  echo FileSharing.exe not found next to this script.
  echo Put Allow Network.bat in the same folder as Toss.exe.
  goto done
)

echo Adding firewall rules for Toss / FileSharing...
echo.

for %%P in (3000 3001 3002 3003) do (
  netsh advfirewall firewall delete rule name="FileSharing TCP %%P" >nul 2>&1
  netsh advfirewall firewall add rule name="FileSharing TCP %%P" dir=in action=allow protocol=TCP localport=%%P enable=yes profile=any
)

netsh advfirewall firewall delete rule name="FileSharing Program" >nul 2>&1
netsh advfirewall firewall add rule name="FileSharing Program" dir=in action=allow program="%EXE%" enable=yes profile=any

if exist "%TOSS%" (
  netsh advfirewall firewall delete rule name="Toss Program" >nul 2>&1
  netsh advfirewall firewall add rule name="Toss Program" dir=in action=allow program="%TOSS%" enable=yes profile=any
)

echo Done.
echo You can now run FileSharing.exe normally (no admin needed).
echo.

:done
pause
