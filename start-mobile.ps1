$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "正在启动词序手机访问服务..." -ForegroundColor Green
node .\server.mjs
