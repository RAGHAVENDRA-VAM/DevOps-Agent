@echo off
echo Starting DevOps Agent Frontend...
cd /d "%~dp0frontend"
npm run dev
pause