$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Installing npm packages..."
npm install

Write-Host "Generating app icons..."
node scripts/generate-icons.cjs

Write-Host "Building frontend..."
npm run build

Write-Host "Checking Rust backend..."
Set-Location src-tauri
cargo check
Set-Location ..

Write-Host "Done. Run 'npm run tauri:dev' to start the app."
