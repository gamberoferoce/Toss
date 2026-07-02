@echo off
title Toss - Allow network access
echo.
echo Toss - Windows Firewall setup
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Run this file as Administrator ^(right-click - Run as administrator^).
  pause
  exit /b 1
)

set "EXE=%~dp0TossServer.exe"
if not exist "%EXE%" (
  echo TossServer.exe not found next to this script.
  pause
  exit /b 1
)

echo Adding firewall rules for Toss...
echo.

for %%P in (3000 3001 3002 3003) do (
  netsh advfirewall firewall delete rule name="Toss TCP %%P" >nul 2>&1
  netsh advfirewall firewall add rule name="Toss TCP %%P" dir=in action=allow protocol=TCP localport=%%P enable=yes profile=any
)

netsh advfirewall firewall delete rule name="Toss Server" >nul 2>&1
netsh advfirewall firewall add rule name="Toss Server" dir=in action=allow program="%EXE%" enable=yes profile=any

echo Done.
echo You can now run Toss.exe normally ^(no admin needed^).
echo.
pause
