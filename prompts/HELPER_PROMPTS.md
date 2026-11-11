# HELPER PROMPTS (copy-paste when needed)

Replace `{{...}}` before sending. Always attach `@AGENTS.md` and `@docs/PRD.md`.

---

## 1) CONTINUE — agent stopped midway / context got long
```
Continue the current phase. Do NOT start over and do NOT redo finished work.
1. Open docs/PROGRESS.md and `git log --oneline -15` and `git status`.
2. List which tasks are done, which are in progress, which remain.
3. Verify the last "done" task actually works (run typecheck, lint, tests for that area). Fix if broken.
4. Continue with the first unfinished task in order. Follow AGENTS.md rules. Commit after each task.
5. At the end print the ACCEPTANCE CHECKLIST and the phase report.
```

## 2) BUG FIX — something is broken
```
BUG REPORT
Where: {{page / API route / file}}
Steps to reproduce: {{numbered steps}}
Expected: {{...}}
Actual: {{...}} (paste exact error text / console output / screenshot description)

Instructions:
1. First reproduce the bug yourself (run the app or write a failing test). Show the failing evidence.
2. Find the ROOT CAUSE (explain in 3–5 lines). Do not patch symptoms, do not add try/catch to hide it.
3. Write a regression test that fails before the fix and passes after.
4. Fix with the smallest change that respects AGENTS.md and docs/PRD.md. 
5. Run `pnpm typecheck && pnpm lint && pnpm test && (cd apps/compute && pytest -q)`.
6. Check nearby screens/routes that use the same code for the same bug (list what you checked).
7. Commit: `fix({{area}}): {{summary}}` and report: cause, fix, tests added, anything risky.
```

## 3) UI CONSISTENCY AUDIT — run after each phase that adds screens
```
Run a UI consistency audit on the pages added/changed in the last phase: {{list pages}}.
For each page at 375px, 768px and 1280px check: tokens only (no hard-coded colours), fonts, spacing, button/input/select/slider/tab hover + focus-visible + disabled + loading states, labels + units + tooltips on all fields, inline errors, empty/loading/error states, no horizontal page scroll, chart table-alternative + zoom/reset + exports, status vocabulary, number/date formats, no NaN/undefined/null text, no console errors.
Write findings to docs/UI_AUDIT.md (screen · issue · severity · fixed?) and FIX every issue. Use the shared components only; if a needed component variant doesn't exist, add it to the design system instead of styling one-off. Re-run the checks and commit.
```

## 4) PRD COMPLIANCE REVIEW — before moving to the next phase
```
Act as a strict reviewer. Re-read docs/PRD.md sections relevant to {{phase / feature}}. For EVERY sentence with "must", "never", "always", "require", "block", "show", "label", "default", verify it in the code and the running app. Output a table: requirement → where implemented → verified how → PASS/FAIL. Fix every FAIL (with tests), then re-verify. Do not mark PASS without evidence (file path + test name or a command output).
```

## 5) SCIENCE SANITY CHECK — after Phase 3 or any change to models
```
Review apps/compute/app/models/*, evaluation/*, uncertainty/* against docs/PRD.md section 5 and 7 line by line. Check: equations (incl. dC/dt), initial conditions (S0, R0 = N−S0−I0), mapping mu_d = rho*(C(t+1)−C(t)), NB variance mu+mu²/k, bounds, log-space optimisation, seeds, change-point candidate rules (every 7 days, ≥21 each side, training-only), origins (13), dev/final split (9/4), baselines, MAE/RMSE/total-error definitions, selection rules thresholds (10%, 6/9, 3/4), per-prefix normalization (no leakage), bootstrap (200, ≥180 reliable), predictive vs parameter intervals. For each: show the code line + the test covering it. Fix any mismatch and add missing tests.
```

## 6) DEPLOY HELP
```
Deployment problem: {{Vercel build error / Railway crash / DB connection / CORS / OAuth redirect / ...}}
Logs: {{paste}}
First restate which service fails (web on Vercel, compute on Railway, Neon). Check env vars against .env.example, Prisma pooled vs direct URL, ALLOWED_ORIGINS, COMPUTE_URL, AUTH_URL/AUTH_SECRET, Google redirect URI. Propose the minimal fix, apply it to configs/docs (never commit secrets), and update docs/DEPLOY.md with the lesson.
```

## 7) EXPLAIN-THE-CODE (for you, the portfolio owner)
```
Explain this project to me as if I must present it to a client in 10 minutes: architecture, data flow of one run from click to chart, the 5 hardest technical decisions and why, what is tested, what the limitations are. Use docs/DECISIONS.md and the actual code. Keep it in simple Hinglish with short sections.
```
