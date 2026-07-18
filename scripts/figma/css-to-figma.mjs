#!/usr/bin/env node
/**
 * css-to-figma.mjs — Sync CSS → Figma variables (DTCG JSON)
 *
 * Input:  scripts/figma/code-tokens/theme.css (output of figma-to-css.mjs)
 * Output: scripts/figma/figma-tokens/{mode}.tokens.json
 *
 * Token metadata (`variableId`, `scopes`, `$type`, etc.) is preserved by
 * merging with the existing `*.tokens.json` files; any token in the CSS that
 * has no entry in the original JSON gets sensible defaults. Tokens that
 * figma-to-css intentionally omits from the CSS (SKIP_TOKENS) are re-injected
 * from the existing JSON so the roundtrip is lossless.
 *
 * Usage: node scripts/figma/css-to-figma.mjs [css-dir] [tokens-dir]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { converter, formatHex, clampChroma } from 'culori';

// Ensure the oklch converter is registered so we can route to rgb/srgb.
converter('oklch');
const toRgb = converter('rgb');

const CSS_DIR = process.argv[2] ?? 'scripts/figma/code-tokens';
const TOKENS_DIR = process.argv[3] ?? 'scripts/figma/figma-tokens';

const MODES = ['Light', 'Dark', 'Blue Light', 'Blue Dark'];

// The single consolidated file that figma-to-css emits.
const THEME_FILE = 'theme.css';

// Inverse of NUMBER_MAP in figma-to-css.mjs: CSS var name → token name.
const CSS_VAR_TO_TOKEN = { radius: 'radius-lg' };
// Tokens that figma-to-css never writes to CSS (its SKIP_NUMBERS). They must
// be carried over from the existing JSON or they'd vanish on every sync.
const SKIP_TOKENS = ['radius-sm', 'radius-md', 'radius-xl', 'radius-2xl'];

// 8 decimals is plenty for 8-bit-per-channel color and avoids float noise
// (e.g. 0.30000000000000004) churning the JSON diffs.
const round = (n, d = 8) => +n.toFixed(d);
const clamp01 = (n) => Math.min(1, Math.max(0, n));

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

/**
 * Flatten an existing (possibly nested) DTCG file into leafName → token, so
 * metadata lookups work whether the original JSON was flat or grouped.
 */
function flattenExisting(obj, out = {}, path = '') {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && '$value' in val) {
      if (out[key] !== undefined) {
        console.warn(`  [warn] duplicate leaf token name "${key}" (at "${path}${key}"); last one wins`);
      }
      out[key] = val;
    } else if (val && typeof val === 'object') {
      flattenExisting(val, out, `${path}${key}/`);
    }
  }
  return out;
}

function parseBlock(css, selector) {
  // Escape any regex-special chars in the selector, then capture its {...}.
  // NOTE: `[^}]*` assumes flat blocks (no nested rules/@media), which is what
  // figma-to-css emits. Hand-edited CSS with nesting will not parse correctly.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?:^|\\n)[ \\t]*' + escaped + '\\s*\\{([^}]*)\\}', 'g');
  const decls = {};
  let m;
  while ((m = re.exec(css))) {
    const declRe = /--([\w-]+)\s*:\s*([^;]+);/g;
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
  const ok = { mode: 'oklch', l: L, c: C, h: Number.isNaN(H) ? 0 : H };
  let c = toRgb(ok);
  // Out-of-sRGB-gamut colors: naive per-channel clamping distorts the hue a
  // little more on every sync cycle. Gamut-map by reducing chroma instead
  // (keeps L and H), which makes the roundtrip converge.
  const out = (v) => v < -1e-6 || v > 1 + 1e-6;
  if (out(c.r) || out(c.g) || out(c.b)) c = toRgb(clampChroma(ok, 'oklch'));
  // Clamp once and use the SAME values for both components and hex, so they
  // can never disagree.
  const rgb = { mode: 'rgb', r: clamp01(c.r ?? 0), g: clamp01(c.g ?? 0), b: clamp01(c.b ?? 0) };
  const components = [round(rgb.r), round(rgb.g), round(rgb.b)];
  const hex = formatHex(rgb).toUpperCase();
  // Alpha may be a percentage ("50%") — what figma-to-css emits — or a plain
  // number ("0.5") if the CSS was edited by hand. Handle both.
  let alpha = 1;
  if (alphaStr !== undefined) {
    const a = parseFloat(alphaStr.trim());
    alpha = alphaStr.includes('%') ? a / 100 : a;
    if (Number.isNaN(alpha)) alpha = 1;
    alpha = clamp01(alpha);
  }
  return {
    colorSpace: 'srgb',
    components,
    alpha: round(alpha),
    hex,
  };
}

/** Convert a `0.875rem` (or px) declaration back to a Figma px number. */
function remToPx(str) {
  const m = str.trim().match(/^(-?[\d.]+)(rem|px)?$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (Number.isNaN(v)) return null;
  return m[2] === 'rem' ? v * 16 : v; // px or unitless → px
}

function buildToken(name, declValue, original) {
  if (declValue.startsWith('oklch(')) {
    return {
      $type: 'color',
      $value: oklchToDtcg(declValue),
      $extensions: original?.$extensions ?? {
        'com.figma.scopes': ['ALL_FILLS', 'STROKE_COLOR'],
        'com.figma.codeSyntax': { WEB: `var(--${name})` },
      },
    };
  }
  const px = remToPx(declValue);
  if (px !== null) {
    return {
      // Preserve the original $type ('dimension' vs 'number') when known.
      $type: original?.$type ?? 'number',
      $value: round(px),
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
  const baseMode = mode.replace(/^Blue /, '');
  const layers = [BASE_SELECTORS[baseMode]];
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
  let existing = tokensPath ? flattenExisting(JSON.parse(readFileSync(tokensPath, 'utf8'))) : {};
  if (mode.startsWith('Blue')) {
    const basePath = findExistingTokens(baseMode);
    if (basePath) {
      const base = flattenExisting(JSON.parse(readFileSync(basePath, 'utf8')));
      existing = { ...base, ...existing };
    }
  }

  const out = { $extensions: { 'com.figma.modeName': mode } };
  for (const [varName, value] of Object.entries(decls)) {
    // Undo figma-to-css renames (e.g. --radius → radius-lg).
    const name = CSS_VAR_TO_TOKEN[varName] ?? varName;
    const token = buildToken(name, value, existing[name]);
    if (token) out[name] = token;
    else console.warn(`  [warn] ${mode}: --${varName} = "${value}" is not a color/size, skipped`);
  }

  // Re-inject tokens that figma-to-css deliberately never writes to CSS.
  for (const name of SKIP_TOKENS) {
    if (!out[name] && existing[name]) out[name] = existing[name];
  }

  // Flag tokens that existed before but are gone from the CSS — they will be
  // dropped from the JSON (and eventually from Figma). Usually intentional
  // (a variable was deleted), but worth surfacing.
  for (const name of Object.keys(existing)) {
    if (!out[name]) {
      console.warn(`  [warn] ${mode}: token "${name}" exists in JSON but not in CSS — it will be removed`);
    }
  }

  const outPath = join(TOKENS_DIR, `${mode}.tokens.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  written.push(outPath);
}
console.log(`Wrote ${written.length} tokens file(s):\n${written.map((f) => `  ${f}`).join('\n')}`);
