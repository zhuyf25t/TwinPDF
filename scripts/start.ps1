Set-Location $PSScriptRoot\..
if (-not (Test-Path node_modules)) {
  Write-Host "[TwinPDF] Installing dependencies if needed..."
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[TwinPDF] npm install failed. Try: npm config set registry https://registry.npmmirror.com"
    exit 1
  }
}
Write-Host "[TwinPDF] Starting dev server..."
npm run dev
