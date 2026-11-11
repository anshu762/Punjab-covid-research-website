# EpiLens — Prompt Pack (START HERE)

Is pack me sab kuch hai jo Cursor / Antigravity (Gemini Flash) ko end-to-end build karne ke liye chahiye.

```
START_HERE.md                         <- ye file (sirf tumhare liye)
AGENTS.md                             <- global rules, repo ROOT me rakhna
docs/PRD.md                           <- tumhara PRD (Markdown), repo me rakhna
prompts/PHASE_1_FOUNDATION_AND_LANDING.md
prompts/PHASE_2_DATA_AND_OVERVIEW.md
prompts/PHASE_3_MODEL_ENGINE_AND_RUNS.md
prompts/PHASE_4_RESULTS.md
prompts/PHASE_5_SCENARIOS_RUNS_DOWNLOADS_AI.md
prompts/PHASE_6_METHODS_POLISH_DEPLOY.md
prompts/HELPER_PROMPTS.md             <- continue / bug-fix / audit prompts
```

## 0. Pehle ye accounts/keys ready rakho (Phase 1 se pehle)
1. **Neon**: naya project banao → 2 connection strings lo: *pooled* (`DATABASE_URL`) aur *direct* (`DIRECT_URL`).
2. **Google OAuth** (optional, demo login iske bina bhi chalega): Google Cloud Console → OAuth client → redirect `http://localhost:3000/api/auth/callback/google`.
3. **OpenRouter** API key (Phase 5 me chahiye).
4. GitHub repo (empty).
5. Local machine: Node 22, pnpm, Python 3.12, Git.

## 1. Repo setup (ek baar)
```
mkdir epilens && cd epilens
# is pack se copy karo: AGENTS.md, docs/PRD.md, prompts/ folder
git init
```
Cursor ke liye optional: `AGENTS.md` ko `.cursor/rules/global.mdc` me bhi copy kar do (frontmatter me `alwaysApply: true`).

## 2. Har phase kaise chalana (Flash model ke liye zaroori)
- **Har phase = naya chat.** Do phases ek chat me kabhi nahi.
- Agent/Agent-mode me kholo, ye attach karo: `@AGENTS.md @docs/PRD.md @prompts/PHASE_N_....md`
- Message me likho:
  > Execute this phase prompt completely, task by task, in order. Follow AGENTS.md strictly. Do not skip checkpoints or the acceptance checklist. Start by writing the task checklist into docs/PROGRESS.md.
- Agent beech me ruk jaye / context bhar jaye → `HELPER_PROMPTS.md` ka **#1 CONTINUE** paste karo.
- Phase khatam hone par:
  1. Agent ka PHASE REPORT padho (Manual test script follow karo, khud app chala ke dekho).
  2. Kuch toota ho to **#2 BUG FIX** prompt.
  3. UI ke liye **#3 UI AUDIT**, aur Phase 3/4 ke baad **#4 / #5** review prompts.
  4. Sab theek → `git tag phase-N` → next phase naye chat me.

## 3. Phases ka overview
| Phase | Kya banega | Tumhe kya dikhega |
|---|---|---|
| 1 | Monorepo, DB schema, auth (Google + demo), job queue, design system, app shell, **animated landing page** | Landing + login + 7 empty pages |
| 2 | Data cleaning engine, upload/validation, Data screen, Overview | Real/demo data load, quality report, charts |
| 3 | SIR engine, evaluation, bootstrap, run lifecycle, Model setup | Fit/Evaluate chalana, progress, cancel |
| 4 | Results screen: 5 chart tabs, comparison, exports of figures | Poora results dashboard |
| 5 | Scenario explorer, saved runs/compare, downloads (ZIP), sensitivity, AI explainer | Baaki saare features |
| 6 | Methods page, bug/UI audit, security, E2E tests, deploy, README/case study | Production-ready portfolio piece |

## 4. Important notes
- **Prompts English me hain** (agent ke liye behtar), baat-cheet Hinglish me ho sakti hai.
- Prompts me "Flash-friendly" style hai: chhote numbered tasks, exact file paths, exact numbers, har task ke baad check. Agent ko "creative" mat banne do — PRD/prompt jo bole wahi.
- **Cost:** Vercel Hobby + Neon free + OpenRouter `:free` models = ₹0. Python service Railway pe ~$5/month; bilkul free chahiye to Hugging Face Spaces (Docker) / Render free (cold start ke saath) — `docs/DEPLOY.md` me steps banenge.
- Real Punjab data Phase 2 me `data.covid19india.org` se download hoga; fail hua to agent `docs/BLOCKERS.md` me likhega — data khud invent nahi karega.
- Demo account har visitor ko alag isolated user deta hai (24h baad delete) — recruiter ko dikhane ke liye best.
- Branding: naam "EpiLens" hai (`packages/shared/src/constants.ts` me `APP_NAME`). Badalna ho to wahi ek jagah. Footer me apna naam/link: `NEXT_PUBLIC_AUTHOR_NAME`, `NEXT_PUBLIC_AUTHOR_URL`.
- Ye ek **research-style tool** hai; footer/Methods me "not medical or policy advice" disclaimer rahega.
