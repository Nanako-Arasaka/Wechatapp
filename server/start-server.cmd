@echo off
cd /d "%~dp0"
echo Starting SmartVenue server on port 3000...
node --enable-source-maps dist\src\main
pause
