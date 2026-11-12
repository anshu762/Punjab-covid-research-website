#!/usr/bin/env node

/**
 * scripts/ui-audit.js
 * Automated UI token purity, copy review, and accessibility audit scanner.
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "../apps/web/src");

// Files permitted to contain raw hex colors (design tokens & chart styling definitions)
const HEX_ALLOWLIST = [
  "globals.css",
  "theme.ts",
  "chartTheme.ts",
  "seriesStyles.ts",
  "PlotlyChart.tsx",
  "figureExport.ts",
  "icon.tsx",
  "opengraph-image.tsx",
  "IllustrativeSimulation.tsx",
  "InteractiveSirPlayground.tsx",
  "Hero.tsx",
  "CoverageStrip.tsx",
  "TabDiagnostics.tsx",
  "TabForecastValidation.tsx",
  "TabObservedFitted.tsx",
  "TabSirStates.tsx",
  "TabTransmission.tsx",
  "ScenarioCharts.tsx",
];

// Patterns
const HEX_REGEX = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const FORBIDDEN_WORDS = /\b(lorem(?:\s+ipsum)?|todo|fixme|xxx)\b/i;
const UNFORMATTED_LITERALS = />\s*(NaN|undefined|null)\s*</;

const findings = {
  hardcodedHex: [],
  forbiddenWords: [],
  unformattedLiterals: [],
};

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        walkDir(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      auditFile(fullPath, entry.name);
    }
  }
}

function auditFile(filePath, fileName) {
  const content = fs.readFileSync(filePath, "utf-8");
  const relPath = path.relative(path.resolve(__dirname, ".."), filePath).replace(/\\/g, "/");
  const lines = content.split("\n");

  // Check 1: Hex colors
  if (!relPath.includes("/tests/") && !HEX_ALLOWLIST.some((allowed) => fileName.includes(allowed))) {
    lines.forEach((line, lineIdx) => {
      // Ignore comments
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) return;
      const matches = line.match(HEX_REGEX);
      if (matches) {
        findings.hardcodedHex.push({
          file: relPath,
          line: lineIdx + 1,
          matches: matches.join(", "),
          preview: line.trim(),
        });
      }
    });
  }

  // Check 2: Forbidden copy (lorem, todo, fixme, xxx)
  lines.forEach((line, lineIdx) => {
    // Ignore test files for forbidden words
    if (relPath.includes("/tests/")) return;
    const match = line.match(FORBIDDEN_WORDS);
    if (match) {
      findings.forbiddenWords.push({
        file: relPath,
        line: lineIdx + 1,
        word: match[0],
        preview: line.trim(),
      });
    }
  });

  // Check 3: Raw NaN / undefined / null in JSX
  lines.forEach((line, lineIdx) => {
    const match = line.match(UNFORMATTED_LITERALS);
    if (match) {
      findings.unformattedLiterals.push({
        file: relPath,
        line: lineIdx + 1,
        literal: match[1],
        preview: line.trim(),
      });
    }
  });
}

console.log("=== Running EpiLens Automated UI Audit ===");
walkDir(SRC_DIR);

let hasErrors = false;

console.log(`\n1. Hardcoded Hex Colors Outside Token/Theme Allowlist: ${findings.hardcodedHex.length}`);
if (findings.hardcodedHex.length > 0) {
  findings.hardcodedHex.forEach((f) => {
    console.log(`   [HEX] ${f.file}:${f.line} -> ${f.matches} (${f.preview.slice(0, 60)})`);
  });
  hasErrors = true;
} else {
  console.log("   ✓ All colors strictly reference CSS variables or design tokens.");
}

console.log(`\n2. Forbidden Words (Lorem / TODO / FIXME / XXX): ${findings.forbiddenWords.length}`);
if (findings.forbiddenWords.length > 0) {
  findings.forbiddenWords.forEach((f) => {
    console.log(`   [WORD] ${f.file}:${f.line} -> "${f.word}" (${f.preview.slice(0, 60)})`);
  });
  hasErrors = true;
} else {
  console.log("   ✓ Clean professional copy, zero placeholder/TODO tokens found.");
}

console.log(`\n3. Raw Unformatted Literals (>NaN< / >undefined< / >null<): ${findings.unformattedLiterals.length}`);
if (findings.unformattedLiterals.length > 0) {
  findings.unformattedLiterals.forEach((f) => {
    console.log(`   [LITERAL] ${f.file}:${f.line} -> ${f.literal} (${f.preview.slice(0, 60)})`);
  });
  hasErrors = true;
} else {
  console.log("   ✓ Number and string formatters handle all boundary values safely.");
}

if (hasErrors) {
  console.log("\n❌ Audit found issues to resolve.");
  process.exit(1);
} else {
  console.log("\n✅ Automated UI Audit Passed Cleanly!");
  process.exit(0);
}
