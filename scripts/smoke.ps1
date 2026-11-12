# scripts/smoke.ps1 — PowerShell Post-Deploy Smoke Test for EpiLens
param (
  [string]$WebUrl = "http://localhost:3000",
  [string]$ComputeUrl = "http://localhost:8000"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  EpiLens Production Smoke Test" -ForegroundColor Cyan
Write-Host "  Web URL:     $WebUrl"
Write-Host "  Compute URL: $ComputeUrl"
Write-Host "============================================="

# 1. Web Health
try {
  $webRes = Invoke-WebRequest -Uri "$WebUrl/api/health" -Method Get -TimeoutSec 10 -UseBasicParsing
  Write-Host "[1/4] Web Service Health: OK (HTTP $($webRes.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "[1/4] Web Service Health: FAILED ($($_.Exception.Message))" -ForegroundColor Red
}

# 2. Compute Health
try {
  $computeRes = Invoke-WebRequest -Uri "$ComputeUrl/health" -Method Get -TimeoutSec 10 -UseBasicParsing
  Write-Host "[2/4] Compute Service Health: OK (HTTP $($computeRes.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "[2/4] Compute Service Health: FAILED ($($_.Exception.Message))" -ForegroundColor Red
}

# 3. Security Headers
try {
  $headRes = Invoke-WebRequest -Uri "$WebUrl" -Method Head -TimeoutSec 10 -UseBasicParsing
  $ct = $headRes.Headers["X-Content-Type-Options"]
  $fo = $headRes.Headers["X-Frame-Options"]
  if ($ct -eq "nosniff" -and $fo -eq "DENY") {
    Write-Host "[3/4] Security Headers: OK (nosniff, DENY present)" -ForegroundColor Green
  } else {
    Write-Host "[3/4] Security Headers: Partial ($ct, $fo)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[3/4] Security Headers: Skipped / Error ($($_.Exception.Message))" -ForegroundColor Yellow
}

# 4. Public Login Route
try {
  $loginRes = Invoke-WebRequest -Uri "$WebUrl/login" -Method Get -TimeoutSec 10 -UseBasicParsing
  Write-Host "[4/4] Public Login Route: OK (HTTP $($loginRes.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "[4/4] Public Login Route: FAILED ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Smoke Test Finished!" -ForegroundColor Cyan
Write-Host "============================================="
