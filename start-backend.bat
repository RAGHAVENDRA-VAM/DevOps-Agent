@echo off
echo Starting DevOps Agent Backend...
cd /d "%~dp0backend"
poetry run uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
pause