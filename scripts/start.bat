@echo off
cd /d %~dp0\..
echo [TwinPDF] Installing dependencies if needed...
if not exist node_modules (
  npm install
  if errorlevel 1 (
    echo [TwinPDF] npm install failed. Try: npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
  )
)
echo [TwinPDF] Starting dev server...
npm run dev
pause
