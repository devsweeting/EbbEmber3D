import { build } from 'esbuild';
import { copyFile, readFile, rm, writeFile, mkdir } from 'node:fs/promises';

const minify = process.argv.includes('--minify');

await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/app.js',
  minify,
  sourcemap: minify ? false : 'inline',
  legalComments: 'none',
  logLevel: 'warning',
});

const js = await readFile('dist/app.js', 'utf8');
const safeJs = js.replace(/<\/script/gi, () => '<\\/script');

// Layered Cascade foothills and a snow-capped peak, catching the last pink light.
const ridges = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" preserveAspectRatio="none">
<defs>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a98"/><stop offset="1" stop-color="#c7557f" stop-opacity="0"/></linearGradient>
<linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b2f73"/><stop offset="1" stop-color="#8b3f78" stop-opacity="0"/></linearGradient>
<linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0e6"/><stop offset="1" stop-color="#ff9fa0"/></linearGradient>
</defs>
<path fill="url(#far)" d="M0 205 L90 180 L170 195 L270 160 L360 188 L455 170 L560 178 L650 150 L735 132 L790 88 L850 34 L905 92 L950 128 L1000 150 V300 H0Z"/>
<path fill="url(#snow)" d="M850 34 L790 88 L808 82 L820 98 L836 84 L850 106 L866 86 L882 100 L905 92Z"/>
<path fill="url(#near)" d="M0 238 L80 215 L150 232 L240 205 L330 229 L420 210 L520 234 L620 208 L710 232 L800 212 L900 230 L1000 215 V300 H0Z"/>
</svg>`;

// A repeatable star field: scattered stars plus a dense Milky Way band.
function starField(seed, count, bandCount, withBand) {
  let n = seed;
  const rand = () => {
    n = (n + 0x6d2b79f5) | 0;
    let x = Math.imul(n ^ (n >>> 15), 1 | n);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const tones = ['#ffffff', '#e4edff', '#fff2d2', '#c5d9ff'];
  const dots = [];
  const star = (x, y, big) => {
    const r = big ? 1.35 + rand() * 0.85 : 0.6 + rand() * 0.8;
    const fill = tones[Math.floor(rand() * tones.length)];
    if (big) dots.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 2.3).toFixed(1)}" fill="${fill}" opacity=".16"/>`);
    dots.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${(0.72 + rand() * 0.28).toFixed(2)}"/>`);
  };
  for (let i = 0; i < count; i++) star(rand() * 1600, rand() ** 1.2 * 640, i % 9 === 0);
  for (let i = 0; i < bandCount; i++) {
    const k = rand(), off = (rand() + rand() + rand() - 1.5) * 105;
    star(90 + k * 1420 + off * 0.3, 470 - k * 450 + off * 0.95, i % 31 === 0);
  }
  const band = withBand ? `<defs><radialGradient id="mw"><stop offset="0" stop-color="#c8d4ff" stop-opacity=".62"/><stop offset=".48" stop-color="#8496ea" stop-opacity=".28"/><stop offset="1" stop-color="#5b6fce" stop-opacity="0"/></radialGradient></defs><ellipse cx="800" cy="245" rx="900" ry="135" fill="url(#mw)" transform="rotate(-17.6 800 245)"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${band}${dots.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const starsBase = starField(1847, 210, 300, true);
const starsTwinkle = starField(9021, 72, 46, false);

const css = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #1b2028; }
  body { -webkit-tap-highlight-color: transparent; }
  .sky { position: fixed; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
  .sky.on { opacity: 1; }
  #sky-morning { background: radial-gradient(120% 90% at 28% 15%, #fffbe9 0%, #e4f4f4 24%, #b9e0ec 52%, #8cc6dc 80%, #74b5d1 100%); }
  #sky-dusk {
    background:
      radial-gradient(ellipse 25% 2.6% at 19% 11%, rgba(255,177,160,.82), transparent 74%),
      radial-gradient(ellipse 33% 3.2% at 67% 9%, rgba(255,128,150,.62), transparent 74%),
      radial-gradient(ellipse 22% 2.2% at 83% 16%, rgba(255,177,126,.72), transparent 74%),
      radial-gradient(ellipse 30% 2.5% at 44% 17%, rgba(255,120,130,.62), transparent 76%),
      radial-gradient(ellipse 20% 1.8% at 11% 24%, rgba(255,205,135,.78), transparent 76%),
      radial-gradient(ellipse 26% 2% at 62% 24%, rgba(255,184,112,.66), transparent 76%),
      url("data:image/svg+xml,${encodeURIComponent(ridges)}") center 24% / 100% 24% no-repeat,
      radial-gradient(circle at 30% 31%, #fff6c9 0 1.9vmin, #ffdc83 3.3vmin, rgba(255,159,74,.82) 9vmin, rgba(255,95,92,.36) 25vmin, transparent 50vmin),
      linear-gradient(180deg, #1d1c55 0%, #3a2a78 9%, #74358f 17%, #c2437f 25%, #fb6a64 32%, #ff9a55 38%, #ffc768 43%, #ee6f68 54%, #7c3a78 74%, #2c2350 100%);
  }
  #sky-night {
    background:
      radial-gradient(circle at 78% 15%, #fffdf0 0 2.5vmin, #f7f1d5 2.7vmin, rgba(226,233,255,.42) 3.1vmin, rgba(160,184,255,.2) 7vmin, transparent 15vmin),
      ${starsBase} center / cover no-repeat,
      linear-gradient(180deg, #111e52 0%, #1c3278 30%, #2c4a9b 56%, #223a80 76%, #142255 100%);
  }
  #sky-night::after { content: ''; position: absolute; inset: 0; background: ${starsTwinkle} center / cover no-repeat; animation: twinkle 3.6s ease-in-out infinite alternate; }
  @keyframes twinkle { from { opacity: 0.3; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .sky { transition: none; } #sky-night::after { animation: none; } }
  #stage { position: fixed; inset: 0; display: block; width: 100%; height: 100%; outline: none; touch-action: none; cursor: grab; }
  #stage:active { cursor: grabbing; }
  #controls {
    position: fixed; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%);
    display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; width: max-content; max-width: calc(100vw - 16px); padding: 4px; border-radius: 10px; background: #1b2026; border: 1px solid #454c55;
  }
  #controls button {
    min-width: 76px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent;
    color: #f3eee3; font: 500 13px/1 ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif; cursor: pointer; white-space: nowrap;
  }
  .control-set { display: flex; gap: 4px; }
  #times { padding-right: 4px; border-right: 1px solid #454c55; }
  @media (max-width: 560px) { #controls button { min-width: 70px; padding: 0 9px; } }
  /* Phones, in either orientation, keep only the time of day buttons. */
  @media (max-width: 560px), (pointer: coarse) and (max-height: 500px) { #times { padding-right: 0; border-right: 0; } #view-controls { display: none; } }
  #controls button:hover { background: #343b44; }
  #controls button[aria-pressed="true"], #controls button[aria-checked="true"] { background: #e9c08f; color: #1b2026; }
  #controls button.icon-button { display: grid; place-items: center; width: 40px; min-width: 40px; padding: 0; }
  .icon-button svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .icon-button svg[hidden] { display: none; }
  .icon-button .solid { fill: currentColor; }
  #controls #time-morning[aria-checked="true"] { background: linear-gradient(135deg, #ffe89c, #8fd6ea); color: #123341; }
  #controls #time-dusk[aria-checked="true"] { background: linear-gradient(135deg, #ffc15f, #ff7a68 58%, #f0648c); color: #2a1230; }
  #controls #time-night[aria-checked="true"] { background: linear-gradient(135deg, #18265f, #3450a8); color: #fff6d8; box-shadow: inset 0 0 0 1px #8ea6ff; }
  #controls button:focus-visible { outline: 2px solid #ffd894; outline-offset: 1px; }
  /* Centered on the control bar's row: the bar is 50px tall and this is 40px. */
  #github {
    position: fixed; left: 16px; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 5px);
    display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px;
    background: rgba(27, 32, 38, .46); color: rgba(243, 238, 227, .82); transition: background .16s ease, color .16s ease;
  }
  #github svg { width: 20px; height: 20px; fill: currentColor; }
  #github:hover { background: #1b2026; color: #fff; }
  #github:focus-visible { outline: 2px solid #ffd894; outline-offset: 1px; }
  @media (max-width: 359px) { #github { display: none; } }
  #fallback { position: fixed; inset: 0; display: grid; place-items: center; padding: 2rem; color: #f3eee3; font: 14px/1.5 ui-sans-serif, Arial, sans-serif; text-align: center; }
  #fallback[hidden] { display: none; }
`;

function page(scriptTag) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="icon" href="data:," />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#1b2028" />
<title>Ebb &amp; Ember floating sauna diorama</title>
<style>${css}</style>
</head>
<body>
<div id="sky-morning" class="sky"></div><div id="sky-dusk" class="sky on"></div><div id="sky-night" class="sky"></div>
<canvas id="stage" aria-label="Miniature diorama of a floating sauna on a river. Drag to rotate, scroll to zoom." tabindex="0"></canvas>
<div id="controls" role="group" aria-label="Scene controls">
  <div id="times" class="control-set" role="radiogroup" aria-label="Time of day">
    <button id="time-morning" type="button" role="radio" aria-checked="false">Morning</button>
    <button id="time-dusk" type="button" role="radio" aria-checked="true">Dusk</button>
    <button id="time-night" type="button" role="radio" aria-checked="false">Night</button>
  </div>
  <div id="view-controls" class="control-set">
    <button id="pause" class="icon-button" type="button" aria-label="Pause" title="Pause">
      <svg id="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>
      <svg id="icon-play" viewBox="0 0 24 24" aria-hidden="true" hidden><path class="solid" d="M8 5.5v13l10.5-6.5z"/></svg>
    </button>
    <button id="roof" type="button">Open roof</button>
    <button id="reset" class="icon-button" type="button" aria-label="Reset view" title="Reset view">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 3.5v5h5"/></svg>
    </button>
  </div>
</div>
<a id="github" href="https://github.com/devsweeting/EbbEmber3D" target="_blank" rel="noopener noreferrer" aria-label="View the source on GitHub (opens in a new tab)" title="View on GitHub">
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
</a>
<div id="fallback" hidden>This diorama needs a browser with WebGL2 enabled.</div>
${scriptTag}
</body>
</html>
`;
}

await writeFile('index.html', page('<script src="./dist/app.js"></script>'));
await writeFile('ebbember3d.html', page(`<script>${safeJs}</script>`));
// dist/ is the deployable site, so it gets its own entry page.
await writeFile('dist/index.html', page('<script src="./app.js"></script>'));

// The QA audit is a development tool and stays out of production builds.
if (minify) await rm('dist/clipping-audit.js', { force: true });
else await copyFile('qa/clipping-audit.js', 'dist/clipping-audit.js');

console.log(`built dist/app.js (${(js.length / 1024).toFixed(0)} kB), dist/index.html, index.html, ebbember3d.html`);
