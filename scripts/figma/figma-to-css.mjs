#!/usr/bin/env node
/**
 * figma-to-css.mjs — Build src/index.css theme blocks from code tokens.
 *
 * Input:  scripts/figma/figma-tokens/*.tokens.json (the source of truth,
 *         one file per mode in DTCG format).
 * Output: scripts/figma/code-tokens/theme.css      (the four selector blocks
 *         you import into src/index.css).
 *
 * The output consolidates all four modes into a single file with these
 * selectors, in order:
 *   :root                             — Light
 *   .dark                             — Dark
 *   [data-color-theme='blue']         — Blue Light
 *   .dark[data-color-theme='blue']    — Blue Dark
 *
 * For the two Blue modes, only the declarations that differ from their base
 * (Light / Dark) are emitted, matching the style of the original theme.css.
 *
 * Usage: node scripts/figma/figma-to-css.mjs [tokens-dir] [out-file]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse, converter } from 'culori';

const TOKENS_DIR = process.argv[2] ?? 'scripts/figma/figma-tokens';
const OUT_FILE = process.argv[3] ?? 'scripts/figma/code-tokens/theme.css';

const toOklch = converter('oklch');

// Discover available modes from the .tokens.json filenames so we don't hardcode
// only Blue. Every "<Theme> Light" / "<Theme> Dark" file becomes a colored
// override selector in theme.css.
const modeFiles = readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.tokens.json'));
const MODES = [
  { mode: 'Light', selector: ':root', base: null },
  { mode: 'Dark', selector: '.dark', base: null },
];
for (const f of modeFiles) {
  const m = f.match(/^(.+?)\s+(Light|Dark)\.tokens\.json$/);
  if (!m) continue;
  const [, theme, shade] = m;
  const modeName = `${theme} ${shade}`;
  if (MODES.some((x) => x.mode === modeName)) continue;
  const selector = shade === 'Dark'
    ? `.dark[data-color-theme='${theme.toLowerCase()}']`
    : `[data-color-theme='${theme.toLowerCase()}']`;
  MODES.push({ mode: modeName, selector, base: shade });
}
const round = (n, d) => +n.toFixed(d);

// Token-name → CSS-var-name renames. css-to-figma.mjs holds the inverse map
// (CSS_VAR_TO_TOKEN); keep both in sync.
const NUMBER_MAP = { 'radius-lg': '--radius' };
// Tokens intentionally not emitted to CSS. css-to-figma.mjs re-injects these
// from the existing JSON so they survive the roundtrip; keep both lists in sync.
const SKIP_NUMBERS = new Set(['radius-sm', 'radius-md', 'radius-xl', 'radius-2xl']);

function findFile(mode) {
  const files = readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.tokens.json'));
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const target = norm(mode);
  const exact = files.find(
    (f) => norm(f).includes(target) && (target.includes('blue') || !norm(f).includes('blue'))
  );
  if (!exact) throw new Error(`No token file found for mode "${mode}" in ${TOKENS_DIR}`);
  return join(TOKENS_DIR, exact);
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && '$value' in val) {
      out[prefix + key] = { type: val.$type, value: val.$value };
    } else if (val && typeof val === 'object') {
      Object.assign(out, flatten(val, prefix + key + '/'));
    }
  }
  return out;
}

function cssColor(value) {
  let c = null;
  if (value && typeof value === 'object') {
    if (typeof value.hex === 'string') {
      c = toOklch(parse(value.hex));
    }
    // Fallback: no usable hex, rebuild from DTCG components (0..1 floats).
    if (!c && Array.isArray(value.components)) {
      const [r = 0, g = 0, b = 0] = value.components;
      c = toOklch({ mode: 'rgb', r, g, b });
    }
  } else {
    c = toOklch(parse(String(value)));
  }
  if (!c) return null;
  // 4 decimals: enough for visual fidelity, keeps roundtrip drift negligible.
  const L = round(c.l ?? 0, 4);
  const C = round(c.c ?? 0, 4);
  const H = c.h === undefined || Number.isNaN(c.h) ? 0 : round(c.h, 3);
  // Figma exports alpha as a separate field on the value object; `hex` is RGB-only.
  const rawAlpha =
    value && typeof value === 'object' && typeof value.alpha === 'number'
      ? value.alpha
      : c.alpha;
  const alpha = rawAlpha === undefined ? 1 : round(rawAlpha, 4);
  const base = `oklch(${L} ${C} ${H})`;
  return alpha < 1 ? `oklch(${L} ${C} ${H} / ${round(alpha * 100, 1)}%)` : base;
}

/** Read a DTCG number/dimension value as CSS px. Handles {value, unit} objects. */
function numberToPx(value) {
  if (value && typeof value === 'object') {
    const v = parseFloat(value.value);
    if (Number.isNaN(v)) return null;
    return value.unit === 'rem' ? v * 16 : v; // px (or unitless) otherwise
  }
  const v = parseFloat(value);
  return Number.isNaN(v) ? null : v;
}

function tokensToDecls(tokens, mode) {
  const decls = {};
  const sourceOf = {}; // varName -> full token path, to detect collisions
  for (const [name, { type, value }] of Object.entries(tokens)) {
    const varName = name.split('/').pop();
    if (sourceOf[varName] && sourceOf[varName] !== name) {
      console.warn(
        `  [warn] ${mode}: "${name}" collides with "${sourceOf[varName]}" on --${varName}; last one wins`
      );
    }
    sourceOf[varName] = name;
    if (type === 'color') {
      // DTCG alias: "{otherVar}" — re-emit as CSS var(--otherVar) so the
      // dependency chain survives the roundtrip instead of inlining colors.
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        const target = value.slice(1, -1).split('/').pop();
        decls[`--${varName}`] = `var(--${target})`;
        continue;
      }
      const css = cssColor(value);
      if (css) decls[`--${varName}`] = css;
      else console.warn(`  [warn] ${mode}: color token "${name}" could not be parsed, skipped`);
    } else if (type === 'number' || type === 'dimension') {
      if (SKIP_NUMBERS.has(varName)) continue;
      const target = NUMBER_MAP[varName] ?? `--${varName}`;
      const px = numberToPx(value);
      if (px === null) {
        console.warn(`  [warn] ${mode}: ${type} token "${name}" has no numeric value, skipped`);
        continue;
      }
      decls[target] = `${round(px / 16, 4)}rem`;
    }
  }
  return decls;
}

const declsByMode = {};
for (const { mode } of MODES) {
  const raw = JSON.parse(readFileSync(findFile(mode), 'utf8'));
  declsByMode[mode] = tokensToDecls(flatten(raw), mode);
}

let css = '/* Generated from figma-tokens/ — do not edit, run `node scripts/figma/figma-to-css.mjs` */\n\n';
for (const { mode, selector, base } of MODES) {
  let decls = declsByMode[mode];
  if (base) {
    decls = Object.fromEntries(
      Object.entries(decls).filter(([k, v]) => declsByMode[base][k] !== v)
    );
    if (Object.keys(decls).length === 0) continue;
  }
  css += `${selector} {\n`;
  for (const [k, v] of Object.entries(decls)) css += `  ${k}: ${v};\n`;
  css += '}\n\n';
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, css);
console.log(`theme.css written (${css.split('\n').length} lines).`);
