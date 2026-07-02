@echo off
cd /d "%~dp0"
title Toss
echo.
echo Starting Toss...
echo.
Toss.exe
echo.
echo Toss stopped (exit code %ERRORLEVEL%).
pause
