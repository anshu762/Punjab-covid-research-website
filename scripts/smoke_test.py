"""
Comprehensive production smoke test script for EpiLens.
Tests both Vercel Web BFF and Railway Compute Microservice.
"""
import http.cookiejar
import json
import ssl
import sys
import time
import urllib.parse
import urllib.request

WEB_URL = "https://epilenspunjab.vercel.app"
COMPUTE_URL = "https://epilensweb-production.up.railway.app"

with open("apps/compute/.env") as f:
    env = dict(line.strip().split("=", 1) for line in f if "=" in line and not line.startswith("#"))
SECRET = env.get("COMPUTE_SHARED_SECRET", "").strip("\"' ")

ctx = ssl._create_unverified_context()
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def test_endpoint(name: str, url: str, method: str = "GET", data: bytes | None = None, headers: dict | None = None, use_opener: bool = False):
    start = time.time()
    req = urllib.request.Request(url, data=data, headers=headers or {})
    if method != "GET" and not data:
        req.get_method = lambda: method
    
    try:
        if use_opener:
            resp = opener.open(req)
        else:
            resp = urllib.request.urlopen(req, context=ctx)
        
        duration_ms = int((time.time() - start) * 1000)
        body = resp.read().decode("utf-8", errors="ignore")
        print(f"PASS [{resp.status}] ({duration_ms}ms) - {name}")
        return True, resp.status, body
    except urllib.error.HTTPError as e:
        duration_ms = int((time.time() - start) * 1000)
        body = e.read().decode("utf-8", errors="ignore")
        print(f"FAIL [{e.code}] ({duration_ms}ms) - {name}")
        print(f"     Response: {body[:150]}")
        return False, e.code, body
    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        print(f"ERR  ({duration_ms}ms) - {name}: {exc}")
        return False, 0, str(exc)

def run_all_smoke_tests():
    print("=" * 60)
    print("EPILENS PRODUCTION SMOKE TEST SUITE")
    print(f"Web Base:     {WEB_URL}")
    print(f"Compute Base: {COMPUTE_URL}")
    print("=" * 60)

    # 1. Public Health Checks
    print("\n--- 1. Infrastructure Health Checks ---")
    test_endpoint("Web BFF Health (/api/health)", f"{WEB_URL}/api/health")
    test_endpoint("Compute Microservice Root (/)", f"{COMPUTE_URL}/")
    test_endpoint("Compute Microservice Health (/health)", f"{COMPUTE_URL}/health")
    test_endpoint("Compute Database Connectivity (/health/db)", f"{COMPUTE_URL}/health/db")

    # 2. Worker & Selftest
    print("\n--- 2. Compute Worker & Job Queue ---")
    test_endpoint(
        "Compute Job Worker Wake (/internal/jobs/wake)",
        f"{COMPUTE_URL}/internal/jobs/wake",
        method="POST",
        headers={"X-Internal-Secret": SECRET, "Content-Type": "application/json"},
        data=b"{}",
    )
    test_endpoint(
        "Compute Selftest Enqueue (/internal/selftest)",
        f"{COMPUTE_URL}/internal/selftest",
        method="POST",
        headers={"X-Internal-Secret": SECRET, "Content-Type": "application/json"},
        data=b"{}",
    )

    # 3. Web Authentication
    print("\n--- 3. Web Authentication & Session Flow ---")
    ok, status, csrf_body = test_endpoint("Get CSRF Token (/api/auth/csrf)", f"{WEB_URL}/api/auth/csrf", use_opener=True)
    if not ok:
        print("Aborting auth-dependent tests.")
        return

    csrf_token = json.loads(csrf_body).get("csrfToken")
    signin_payload = urllib.parse.urlencode({
        "csrfToken": csrf_token,
        "callbackUrl": f"{WEB_URL}/overview",
        "json": "true"
    }).encode("utf-8")

    test_endpoint(
        "Launch Demo Researcher Session (/api/auth/callback/demo)",
        f"{WEB_URL}/api/auth/callback/demo",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=signin_payload,
        use_opener=True,
    )

    # 4. Authenticated Web BFF Endpoints
    print("\n--- 4. Authenticated Web Application BFF Routes ---")
    test_endpoint("List Datasets (/api/datasets)", f"{WEB_URL}/api/datasets", use_opener=True)
    test_endpoint("List Runs (/api/runs)", f"{WEB_URL}/api/runs", use_opener=True)
    test_endpoint("List Scenarios (/api/scenarios)", f"{WEB_URL}/api/scenarios", use_opener=True)
    test_endpoint("Dev Selftest BFF (/api/dev/selftest)", f"{WEB_URL}/api/dev/selftest", method="POST", use_opener=True)

    # 5. Dataset Operations
    print("\n--- 5. Dataset Operations ---")
    archive_payload = json.dumps({"sourceKey": "punjab_frozen_archive"}).encode("utf-8")
    test_endpoint(
        "Import Bundled Punjab Archive (/api/datasets/import-bundled)",
        f"{WEB_URL}/api/datasets/import-bundled",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=archive_payload,
        use_opener=True,
    )

    synthetic_payload = json.dumps({"sourceKey": "synthetic_demo"}).encode("utf-8")
    test_endpoint(
        "Import Bundled Synthetic Demo (/api/datasets/import-bundled)",
        f"{WEB_URL}/api/datasets/import-bundled",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=synthetic_payload,
        use_opener=True,
    )

    print("\n" + "=" * 60)
    print("SMOKE TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_all_smoke_tests()
