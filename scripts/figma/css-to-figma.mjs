#!/usr/bin/env node
/**
 * css-to-figma.mjs — Sync CSS → Figma variables (DTCG JSON)
 *
 * Input:  scripts/figma/code-tokens/{mode}.css (one per mode)
 * Output: scripts/figma/figma-tokens/{mode}.tokens.json
 *
 * Each input file is expected to contain a single declaration block with one
 * CSS variable per line (the output of figma-to-css.mjs). Token metadata
 * (`variableId`, `scopes`, etc.) is preserved by merging with the existing
 * `*.tokens.json` files; any token in the CSS that has no entry in the
 * original JSON gets sensible defaults.
 *
 * Usage: node scripts/figma/css-to-figma.mjs [css-dir] [tokens-dir]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, converter, formatHex } from 'culori';

// Ensure the oklch converter is registered so we can route to rgb/srgb.
converter('oklch');
const toRgb = converter('rgb');

const CSS_DIR = process.argv[2] ?? 'scripts/figma/code-tokens';
const TOKENS_DIR = process.argv[3] ?? 'scripts/figma/figma-tokens';

const MODES = ['Light', 'Dark', 'Blue Light', 'Blue Dark'];

// The single consolidated file that figma-to-css emits.
const THEME_FILE = 'theme.css';

const round = (n, d) => +n.toFixed(d);

function findCssFile(mode) {
  const files = readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const target = norm(mode);
  const exact = files.find(
    (f) => norm(f).includes(target) && (target.includes('blue') || !norm(f).includes('blue'))
  );
  if (!exact) throw new Error(`No CSS file found for mode "${mode}" in ${CSS_DIR}`);
  return join(CSS_DIR, exact);
}

function findExistingTokens(mode) {
  // Only look at .tokens.json files, not any stray .css that might be in the dir.
  const files = readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.tokens.json'));
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const target = norm(mode);
  const exact = files.find(
    (f) => norm(f).includes(target) && (target.includes('blue') || !norm(f).includes('blue'))
  );
  return exact ? join(TOKENS_DIR, exact) : null;
}

function parseBlock(css, selector) {
  // Escape any regex-special chars in the selector, then capture its {...}.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g');
  const decls = {};
  let m;
  const declRe = /--([\w-]+)\s*:\s*([^;]+);/g;
  while ((m = re.exec(css))) {
    let dm;
    while ((dm = declRe.exec(m[1]))) decls[dm[1]] = dm[2].trim();
  }
  return decls;
}

/** Convert an oklch() CSS color back to DTCG sRGB value (hex + components + alpha). */
function oklchToDtcg(oklchStr) {
  // Strip the wrapper, then split off the optional " / alpha" suffix.
  const inner = oklchStr.replace(/^oklch\(/, '').replace(/\)$/, '').trim();
  const [lchStr, alphaStr] = inner.split('/');
  const [L, C, H] = lchStr.trim().split(/\s+/).map(parseFloat);
  const c = toRgb({ mode: 'oklch', l: L, c: C, h: Number.isNaN(H) ? 0 : H });
  const rgb = { r: c.r ?? 0, g: c.g ?? 0, b: c.b ?? 0 };
  // DTCG `components` are 0..1 floats, matching the original JSON. Clamp
  // because sRGB roundtrip can overshoot [0,1] for out-of-gamut oklch.
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const components = [round(clamp01(rgb.r), 16), round(clamp01(rgb.g), 16), round(clamp01(rgb.b), 16)];
  const hex = formatHex(rgb).toUpperCase();
  const alpha = alphaStr !== undefined ? parseFloat(alphaStr.trim()) / 100 : 1;
  return {
    colorSpace: 'srgb',
    components,
    alpha: round(alpha, 16),
    hex,
  };
}

/** Convert a `0.875rem` (or px) declaration back to a Figma px number. */
function remToPx(remStr) {
  const m = remStr.match(/^([\d.]+)(rem|px)$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2] === 'rem' ? v * 16 : v;
}

function buildToken(name, declValue, original) {
  if (declValue.startsWith('oklch(')) {
    return {
      $type: 'color',
      $value: oklchToDtcg(declValue),
      $extensions: original?.$extensions ?? {
        'com.figma.scopes': ['ALL_FILLS', 'STROKE'],
        'com.figma.codeSyntax': { WEB: `var(--${name})` },
      },
    };
  }
  const px = remToPx(declValue);
  if (px !== null) {
    return {
      $type: 'number',
      $value: round(px, 16),
      $extensions: original?.$extensions ?? {
        'com.figma.scopes': ['CORNER_RADIUS'],
        'com.figma.codeSyntax': { WEB: `var(--${name})` },
      },
    };
  }
  return null;
}

// Selector per mode (matches what figma-to-css emits).
// For Blue modes, the theme.css only declares the variables that actually
// *change* — everything else inherits from the corresponding base selector.
// We must parse the base first and then overlay the Blue overrides, otherwise
// Figma ends up with an incomplete token set for those modes.
const BASE_SELECTORS = {
  'Light': ':root',
  'Dark': '.dark',
};
const OVERRIDE_SELECTORS = {
  'Light': null,
  'Dark': null,
  'Blue Light': "[data-color-theme='blue']",
  'Blue Dark': ".dark[data-color-theme='blue']",
};

mkdirSync(TOKENS_DIR, { recursive: true });
const themePath = join(CSS_DIR, THEME_FILE);
const themeCss = readFileSync(themePath, 'utf8');

const written = [];
for (const mode of MODES) {
  // Layer the base selector first (so we get every variable declared on
  // :root / .dark) and then the Blue override selector on top so the
  // customisations win.
  const layers = [BASE_SELECTORS[mode.replace(/^Blue /, '')] ?? BASE_SELECTORS[mode]];
  if (OVERRIDE_SELECTORS[mode]) layers.push(OVERRIDE_SELECTORS[mode]);

  const decls = {};
  for (const selector of layers) {
    for (const [name, value] of Object.entries(parseBlock(themeCss, selector))) {
      decls[name] = value;
    }
  }

  // Prefer the existing JSON for the current mode as the metadata cache so
  // Figma scopes / variable IDs are preserved. For Blue modes we ALSO seed
  // from the base JSON so tokens that come from inheritance already carry
  // their original scopes (e.g. sidebar-* from Light/Dark).
  const tokensPath = findExistingTokens(mode);
  let existing = tokensPath ? JSON.parse(readFileSync(tokensPath, 'utf8')) : {};
  if (mode.startsWith('Blue')) {
    const basePath = findExistingTokens(mode === 'Blue Light' ? 'Light' : 'Dark');
    if (basePath) {
      const base = JSON.parse(readFileSync(basePath, 'utf8'));
      existing = { ...base, ...existing };
    }
  }

  const out = { $extensions: { 'com.figma.modeName': mode } };
  for (const [name, value] of Object.entries(decls)) {
    const token = buildToken(name, value, existing[name]);
    if (token) out[name] = token;
  }

  const outPath = join(TOKENS_DIR, `${mode}.tokens.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  written.push(outPath);
}
console.log(`Wrote ${written.length} tokens file(s):\n${written.map((f) => `  ${f}`).join('\n')}`);