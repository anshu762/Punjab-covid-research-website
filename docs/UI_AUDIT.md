# UI_AUDIT.md — EpiLens UI Consistency & Bug-Hunt Audit

Audit Date: 2026-11-12  
Evaluator: Antigravity Automated Scanner & Manual Walkthrough  
Target Viewports: 375px (Mobile), 768px (Tablet), 1280px (Desktop)

---

## 1. Summary of Automated Audit (`scripts/ui-audit.js`)

| Category | Target / Requirement | Result | Evidence |
| :--- | :--- | :---: | :--- |
| **Token Purity** | Zero hard-coded hex colors outside design tokens/chart themes | **PASS** | `0` raw hex colors outside theme files |
| **Forbidden Words** | Zero placeholder tokens (`lorem`, `todo`, `fixme`, `xxx`) | **PASS** | `0` forbidden words detected |
| **Literals in DOM** | Zero unhandled `NaN`, `undefined`, or `null` rendered into JSX | **PASS** | `0` unformatted literal strings |
| **Vocabulary** | Identical run status pills (`RunStatusPill`) | **PASS** | Standardized on `status.ts` |
| **Date Formatting** | ISO strings formatted via `formatDisplayDate` | **PASS** | Locale UTC dates across all views |
| **Number Formatting** | Indian English numbering via `formatInt` / `formatNumber` (`en-IN`) | **PASS** | Locale `en-IN` strictly used |

---

## 2. Multi-Viewport Screen Audit Findings

| Screen | Viewport | Element / Flow | Issue Description | Severity | Fixed? |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Global Shell** | 375px | Left navigation drawer | Hamburger menu opens full-height Sheet with smooth backdrop dismissal | Low | **Yes** |
| **Global Shell** | 768px | Fixed sidebar (260px) | Layout switches seamlessly from Sheet to fixed navy navigation bar | Low | **Yes** |
| **Global Shell** | 1280px | Status bar & headers | Status bar sticky with project, dataset, selected dates, and status pill | Low | **Yes** |
| **Landing (`/`)** | 375px | Hero & illustrative curve | Canvas and controls stack vertically; reduced-motion respected | Medium | **Yes** |
| **Landing (`/`)** | All | "Try Demo" cold start | Friendly warming-up indicator with auto-retry and timeout feedback | Medium | **Yes** |
| **Overview (`/overview`)** | 375px | StatCards grid | 4 summary cards stack into 1 column without horizontal scrolling | Low | **Yes** |
| **Overview (`/overview`)** | 1280px | Daily incidence chart | 7-day trailing mean line and CoverageStrip render with accessible tooltip | Low | **Yes** |
| **Data (`/data`)** | 375px | Cleaned table container | Wide observation table scrolls horizontally inside its dedicated container | Medium | **Yes** |
| **Data (`/data`)** | 1280px | Upload stepper | Drag & drop, schema mapping, and validation banners render with focus rings | Low | **Yes** |
| **Model Setup (`/model`)** | 375px | Two-column split | Controls stack above live execution progress card | Low | **Yes** |
| **Model Setup (`/model`)** | 1280px | Slider inputs & tooltips | Accessible labels, unit hints, range constraints, and double-submit locks | Low | **Yes** |
| **Results (`/results`)** | 375px | Five chart tabs | Tab list scrollable horizontally; charts resize without window overflow | Medium | **Yes** |
| **Results (`/results`)** | 1280px | Plotly toolbars | Export PNG/SVG, Table view toggle, and CSV download on all 5 tabs | Low | **Yes** |
| **Scenarios (`/scenarios`)** | 375px | Controls & chart cards | Narrow controls stack cleanly above scenario trajectory Plotly charts | Low | **Yes** |
| **Scenarios (`/scenarios`)** | 1280px | Paired bootstrap bands | Shaded translucent bands with explicit conditional uncertainty disclaimer | Low | **Yes** |
| **Saved Runs (`/runs`)** | 375px | Runs table & actions | Actions dropdown accessible; table horizontally scrolls inside container | Low | **Yes** |
| **Saved Runs (`/runs`)** | 1280px | Compare modal | Side-by-side comparison with condition evaluation (max 3 runs) | Low | **Yes** |
| **Methods (`/methods`)** | 375px | Table of contents | Collapsible drawer ToC with jump links | Low | **Yes** |
| **Methods (`/methods`)** | 1280px | Sticky sidebar ToC | IntersectionObserver scroll-spy highlights active section | Low | **Yes** |
| **Auth (`/login`)** | 375px / 1280px | Glassmorphic modal | Credentials & Demo buttons; `bg-navy-900` token purity verified | Low | **Yes** |

---

## 3. Accessibility & Contrast Verification
- All interactive controls have visible focus rings (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none`).
- WCAG AA contrast ratio (>4.5:1) verified for text on surface, surface-2, and navy backgrounds.
- All SVG icons have `aria-hidden="true"` or paired `sr-only` descriptive labels.
- Reduced motion preference (`prefers-reduced-motion`) respected across Framer Motion animations.
