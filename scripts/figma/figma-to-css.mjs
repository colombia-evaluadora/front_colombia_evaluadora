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
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, converter } from 'culori';

const TOKENS_DIR = process.argv[2] ?? 'scripts/figma/figma-tokens';
const OUT_FILE = process.argv[3] ?? 'scripts/figma/code-tokens/theme.css';

const MODES = [
  { mode: 'Light', selector: ':root', base: null },
  { mode: 'Dark', selector: '.dark', base: null },
  { mode: 'Blue Light', selector: "[data-color-theme='blue']", base: 'Light' },
  { mode: 'Blue Dark', selector: ".dark[data-color-theme='blue']", base: 'Dark' },
];

const toOklch = converter('oklch');
const round = (n, d) => +n.toFixed(d);

const NUMBER_MAP = { 'radius-lg': '--radius' };
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
  const raw = value && typeof value === 'object' && 'hex' in value
    ? (value.hex ?? String(value))
    : String(value);
  const c = toOklch(parse(raw));
  if (!c) return null;
  const L = round(c.l ?? 0, 3);
  const C = round(c.c ?? 0, 3);
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

function tokensToDecls(tokens) {
  const decls = {};
  for (const [name, { type, value }] of Object.entries(tokens)) {
    const varName = name.split('/').pop();
    if (type === 'color') {
      const css = cssColor(value);
      if (css) decls[`--${varName}`] = css;
    } else if (type === 'number' || type === 'dimension') {
      if (SKIP_NUMBERS.has(varName)) continue;
      const target = NUMBER_MAP[varName] ?? `--${varName}`;
      const px = typeof value === 'object' ? parseFloat(value.value) : parseFloat(value);
      decls[target] = `${round(px / 16, 4)}rem`;
    }
  }
  return decls;
}

const declsByMode = {};
for (const { mode } of MODES) {
  const raw = JSON.parse(readFileSync(findFile(mode), 'utf8'));
  declsByMode[mode] = tokensToDecls(flatten(raw));
}

let css = '/* Generated from code-tokens/ — do not edit, run `node scripts/figma/figma-to-css.mjs` */\n\n';
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

writeFileSync(OUT_FILE, css);
console.log(`theme.css written (${css.split('\n').length} lines).`);