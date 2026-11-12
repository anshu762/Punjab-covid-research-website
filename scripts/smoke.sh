#!/usr/bin/env bash
set -e

# scripts/smoke.sh — Post-Deploy Smoke Test for EpiLens
# Usage: ./scripts/smoke.sh [WEB_URL] [COMPUTE_URL]

WEB_URL="${1:-http://localhost:3000}"
COMPUTE_URL="${2:-http://localhost:8000}"

echo "============================================="
echo "  EpiLens Production Smoke Test"
echo "  Web URL:     $WEB_URL"
echo "  Compute URL: $COMPUTE_URL"
echo "============================================="

# 1. Web Service Health
echo -n "[1/4] Checking Web Service Health (/api/health)... "
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/api/health" || true)
if [ "$WEB_HEALTH" = "200" ]; then
  echo "OK (HTTP 200)"
else
  echo "FAILED (HTTP $WEB_HEALTH)"
  exit 1
fi

# 2. Compute Service Health
echo -n "[2/4] Checking Compute Service Health (/health)... "
COMPUTE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$COMPUTE_URL/health" || true)
if [ "$COMPUTE_HEALTH" = "200" ]; then
  echo "OK (HTTP 200)"
else
  echo "FAILED (HTTP $COMPUTE_HEALTH)"
  exit 1
fi

# 3. Security Headers Verification
echo -n "[3/4] Verifying HTTP Security Headers... "
HEADERS=$(curl -s -I "$WEB_URL" || true)
if echo "$HEADERS" | grep -iq "x-content-type-options: nosniff" && echo "$HEADERS" | grep -iq "x-frame-options: DENY"; then
  echo "OK (Headers verified)"
else
  echo "WARNING (Security headers missing or partial)"
fi

# 4. Public Landing & Login Access
echo -n "[4/4] Verifying Public Login Route (/login)... "
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/login" || true)
if [ "$LOGIN_STATUS" = "200" ]; then
  echo "OK (HTTP 200)"
else
  echo "FAILED (HTTP $LOGIN_STATUS)"
  exit 1
fi

echo "============================================="
echo "  ✅ All Smoke Checks Passed Successfully!"
echo "============================================="
