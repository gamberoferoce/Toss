@echo off
cd /d "%~dp0"
title FileSharing
echo.
echo Starting FileSharing...
echo.
FileSharing.exe
echo.
echo FileSharing stopped (exit code %ERRORLEVEL%).
pause
