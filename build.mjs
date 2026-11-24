import { build } from 'esbuild';
import { copyFile, readFile, writeFile, mkdir } from 'node:fs/promises';

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

const css = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #1b2028; }
  body {
    background: radial-gradient(120% 90% at 30% 18%, #d98f70 0%, #8d6b78 24%, #48505f 50%, #232a34 78%, #1a1f27 100%);
    -webkit-tap-highlight-color: transparent;
  }
  #stage { position: fixed; inset: 0; display: block; width: 100%; height: 100%; outline: none; touch-action: none; cursor: grab; }
  #stage:active { cursor: grabbing; }
  #controls {
    position: fixed; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%);
    display: flex; gap: 4px; padding: 4px; border-radius: 10px; background: #1b2026; border: 1px solid #454c55;
  }
  #controls button {
    min-width: 76px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent;
    color: #f3eee3; font: 500 13px/1 ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif; cursor: pointer; white-space: nowrap;
  }
  #controls button:hover { background: #343b44; }
  #controls button[aria-pressed="true"] { background: #e9c08f; color: #1b2026; }
  #controls button:focus-visible { outline: 2px solid #ffd894; outline-offset: 1px; }
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
<title>Ebb &amp; Ember floating sauna, draft diorama</title>
<style>${css}</style>
</head>
<body>
<canvas id="stage" aria-label="Miniature diorama of a floating sauna on a river at sunset. Drag to rotate, scroll to zoom." tabindex="0"></canvas>
<div id="controls" role="group" aria-label="Scene controls">
  <button id="pause" type="button">Pause</button>
  <button id="roof" type="button">Open roof</button>
  <button id="reset" type="button">Reset view</button>
</div>
<div id="fallback" hidden>This diorama needs a browser with WebGL2 enabled.</div>
${scriptTag}
</body>
</html>
`;
}

await writeFile('index.html', page('<script src="./dist/app.js"></script>'));
await writeFile('ebbember3d.html', page(`<script>${safeJs}</script>`));

await copyFile('qa/clipping-audit.js', 'dist/clipping-audit.js');

console.log(`built dist/app.js (${(js.length / 1024).toFixed(0)} kB), index.html, ebbember3d.html`);
