// Static checks for the door-15 page: no browser, no dependencies (node:test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const count = (src, re) => (src.match(re) || []).length;

test('page is German and about 15. Dezember', () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /class="hero__door">15</);
  assert.match(html, /15\. Dezember/);
  assert.equal(count(html, /<h1[ >]/g), 1);
});

test('stylesheet is linked and every block/element class is styled', () => {
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  // BEM modifiers (e.g. snowman--left) may be unstyled hooks, so only blocks/elements are checked
  const used = new Set([...html.matchAll(/class="([^"]+)"/g)]
    .flatMap(m => m[1].split(/\s+/)).filter(c => !c.includes('--')));
  const missing = [...used].filter(c => !new RegExp(`\\.${c}(?![\\w-])`).test(css));
  assert.deepEqual(missing, []);
});

test('snowfall: three decorative layers animated by @keyframes snowfall', () => {
  assert.match(html, /<div class="snow" aria-hidden="true">/);
  assert.equal(count(html, /class="snow__layer /g), 3);
  assert.match(css, /@keyframes snowfall/);
  assert.match(css, /\.snow\s*\{[^}]*pointer-events:\s*none/);
  // seamless loop: keyframe distance must equal the tile size each layer defines
  assert.match(css, /background-position:\s*0 var\(--tile\)/);
  for (const layer of ['far', 'mid', 'near']) {
    assert.match(css, new RegExp(`\\.snow__layer--${layer}\\s*\\{[^}]*--tile:[^}]*background-size:\\s*var\\(--tile\\) var\\(--tile\\)`));
  }
});

test('snowmen: two decorative snowmen with head, body, hat, scarf', () => {
  assert.equal(count(html, /class="snowman snowman--/g), 2);
  assert.equal(count(html, /class="snowman snowman--[a-z]+" aria-hidden="true"/g), 2);
  for (const part of ['ball--bottom', 'ball--middle', 'ball--head', 'scarf', 'hat']) {
    assert.equal(count(html, new RegExp(`snowman__${part}"`, 'g')), 2, part);
  }
});

test('cress: green sprouts grow via animation, each with height and delay index', () => {
  assert.match(html, /class="cress" role="img" aria-label="[^"]+"/);
  const sprouts = [...html.matchAll(/class="sprout" style="--i:(\d+);--h:(\d+)px"/g)];
  assert.ok(sprouts.length >= 8, `only ${sprouts.length} sprouts`);
  assert.equal(sprouts.length, count(html, /class="sprout"/g), 'every sprout sets --i and --h');
  for (const [, , h] of sprouts) assert.ok(+h <= 110, `sprout ${h}px exceeds the 110px container`);
  assert.match(css, /@keyframes grow\s*\{\s*from\s*\{\s*scale:\s*1 0;/);
  assert.match(css, /\.sprout\s*\{[^}]*animation:\s*grow[^;]*calc\(var\(--i\)[^;]*both/);
  assert.match(css, /--cress:\s*#[0-9a-f]{6}/i);
});

test('dummy content: steps with image placeholders and tips', () => {
  assert.equal(count(html, /<li class="card">/g), 4);
  assert.ok(count(html, /<figure class="placeholder">/g) >= 4);
  assert.match(html, /<section class="tips">/);
});

test('respects prefers-reduced-motion', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none !important/);
});

test('every animation name used has a matching @keyframes', () => {
  const defined = new Set([...css.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1]));
  const used = [...css.matchAll(/animation:\s*([^;]+);/g)]
    .flatMap(m => m[1].replace(/\([^()]*\)/g, '').split(',').map(part => part.trim().split(/\s+/)[0]))
    .filter(name => name !== 'none');
  assert.ok(used.length > 0);
  for (const name of used) assert.ok(defined.has(name), `missing @keyframes ${name}`);
});
