@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
echo Starting UBUMWE RMS...
start http://localhost:5173
call npm run dev
