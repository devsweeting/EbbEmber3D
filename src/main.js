// Ebb & Ember floating sauna: stroked-toon diorama, draft 1.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStrokedToon } from './core/stroked-toon.js';
import { createKit, smooth } from './scene/kit.js';
import { buildEnvironment, SLAB } from './scene/environment.js';
import { buildSauna } from './scene/sauna.js';
import { buildSite } from './scene/site.js';
import { buildCast, LOOP } from './scene/cast.js';
import { createTimeOfDay, TIMES } from './scene/timeOfDay.js';

const canvas = document.getElementById('stage');
const fallback = document.getElementById('fallback');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
} catch {
  fallback.hidden = false;
  throw new Error('WebGL2 unavailable');
}

const look = createStrokedToon(renderer, { thickness: 0.0026 });
const kit = createKit(look);
const scene = new THREE.Scene();

// The light rig; timeOfDay.js sets its colors, strength and sun position.
const hemi = new THREE.HemisphereLight(0xb9c8dd, 0x6b5148, 1.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2a3, 2.75);
sun.target.position.set(4.2, 0, -6.7);
scene.add(sun.target);
sun.position.set(-12.5, 13, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 33, bottom: -29, near: 2, far: 80 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.025;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fb7d8, 0.7);
fill.position.set(12, 7, -9);
scene.add(fill);

const env = buildEnvironment(scene, kit, look);
const sauna = buildSauna(kit, look);
scene.add(sauna.group);
const site = buildSite(scene, kit, look);
const cast = buildCast(sauna, kit, look, site);
const time = createTimeOfDay({
  hemi, sun, fill, kit, env, sauna, site, cast,
  skies: Object.fromEntries(TIMES.map((n) => [n, document.getElementById(`sky-${n}`)])),
});

// Camera: long-lens three-quarter view of the river wall and porch.
const AZ = THREE.MathUtils.degToRad(-24);
const EL = THREE.MathUtils.degToRad(31);
const target = new THREE.Vector3(0, 1.2, 0); // the sauna sits at the center of the frame
const dir = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 700);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(target);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minPolarAngle = 0.12;

const fitPoints = [];
for (const x of [SLAB.x0, SLAB.x1]) {
  for (const z of [SLAB.zBack, SLAB.zFront]) {
    fitPoints.push(new THREE.Vector3(x, -1.1, z), new THREE.Vector3(x, 0.5, z));
  }
}
fitPoints.push(new THREE.Vector3(-4.2, 7.9, -15.65), new THREE.Vector3(6.42, 7.2, -2.1), new THREE.Vector3(5.2, 8.1, -14.45), new THREE.Vector3(3.2, 6.2, -22.7));

let fitDistance = 50;
function solveFit(aspect) {
  const fx = 0.98, fy = 0.9;
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const probe = new THREE.PerspectiveCamera(camera.fov, aspect, 0.1, 700);
  let lo = 8, hi = 420;
  for (let i = 0; i < 40; i++) {
    const d = (lo + hi) / 2;
    probe.position.copy(target).addScaledVector(dir, d);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    probe.matrixWorldInverse.copy(probe.matrixWorld).invert();
    const ok = fitPoints.every((p) => {
      const v = p.clone().applyMatrix4(probe.matrixWorldInverse);
      const depth = -v.z;
      return depth > 0 && Math.abs(v.x) / (depth * tanY * aspect) <= fx && Math.abs(v.y) / (depth * tanY) <= fy;
    });
    if (ok) hi = d; else lo = d;
  }
  return hi;
}

// The opening view sits closer than the full-river fit; scroll out to see it all.
const HERO_ZOOM = 0.68;

function resetView() {
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(dir, fitDistance * HERO_ZOOM);
  camera.lookAt(target);
  controls.update();
}

let userMoved = false;
controls.addEventListener('start', () => { userMoved = true; });

function resize() {
  const w = Math.max(2, canvas.clientWidth);
  const h = Math.max(2, canvas.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitDistance = solveFit(camera.aspect);
  controls.minDistance = fitDistance * 0.26;
  controls.maxDistance = fitDistance * 1.25;
  if (!userMoved) resetView();
}
addEventListener('resize', resize);
resize();

// Roof toggle: a short lift, then the roof is removed to show the room.
let roofGoal = 0, roofValue = 0;
const applyRoof = () => {
  const k = smooth(roofValue);
  sauna.roof.position.y = k * 1.5;
  sauna.roof.visible = roofValue < 0.985;
};

function evaluate(t) {
  env.update(t);
  sauna.group.position.y = Math.sin(t * (Math.PI * 2 / LOOP) * 3) * 0.022;
  sauna.group.rotation.z = Math.sin(t * (Math.PI * 2 / LOOP) * 2) * 0.0022;
  sauna.group.rotation.x = Math.sin(t * (Math.PI * 2 / LOOP) * 4 + 1) * 0.0016;
  site.update(((t % 24) + 24) % 24);
  cast.update(t, !sauna.roof.visible);
}

const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let frozen = params.has('t') ? Number(params.get('t')) : reduced ? 1 : null;
let clock = 0, last = performance.now();

const pauseBtn = document.getElementById('pause');
const roofBtn = document.getElementById('roof');
const syncButtons = () => {
  const label = frozen === null ? 'Pause' : 'Play';
  pauseBtn.setAttribute('aria-label', label);
  pauseBtn.title = label;
  document.getElementById('icon-pause').toggleAttribute('hidden', frozen !== null);
  document.getElementById('icon-play').toggleAttribute('hidden', frozen === null);
  roofBtn.textContent = roofGoal ? 'Close roof' : 'Open roof';
  roofBtn.setAttribute('aria-pressed', String(Boolean(roofGoal)));
};
pauseBtn.addEventListener('click', () => {
  if (frozen === null) frozen = clock;
  else { clock = frozen; frozen = null; last = performance.now(); }
  syncButtons();
});
roofBtn.addEventListener('click', () => {
  roofGoal = roofGoal ? 0 : 1;
  if (reduced) { roofValue = roofGoal; applyRoof(); }
  syncButtons();
});
document.getElementById('reset').addEventListener('click', () => { userMoved = false; resetView(); });
syncButtons();

// Time of day: a three-way radio group, with arrow keys to cycle.
const timeButtons = TIMES.map((n) => document.getElementById(`time-${n}`));
const syncTime = () => timeButtons.forEach((b, i) => {
  const on = TIMES[i] === time.name;
  b.setAttribute('aria-checked', String(on));
  b.tabIndex = on ? 0 : -1;
});
const chooseTime = (name, focus = false) => {
  time.set(name, reduced);
  syncTime();
  if (focus) timeButtons[TIMES.indexOf(name)].focus();
};
timeButtons.forEach((b, i) => {
  b.addEventListener('click', () => chooseTime(TIMES[i]));
  b.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    chooseTime(TIMES[(i + step + TIMES.length) % TIMES.length], true);
  });
});
if (TIMES.includes(params.get('time'))) time.set(params.get('time'), true);
syncTime();

function draw() {
  evaluate(frozen ?? clock);
  look.render(scene, camera);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (frozen === null) clock = (clock + dt) % LOOP;
  time.tick(dt);
  if (roofValue !== roofGoal) {
    const step = dt / 0.55;
    roofValue = roofGoal > roofValue ? Math.min(1, roofValue + step) : Math.max(0, roofValue - step);
    applyRoof();
  }
  controls.update();
  draw();
  requestAnimationFrame(frame);
}

window.__diorama = {
  THREE, scene, camera, renderer, controls, sauna, site, cast, kit, evaluate, LOOP,
  freeze(t) { frozen = t; syncButtons(); draw(); },
  setTime(name, instant = true) { time.set(name, instant); syncTime(); draw(); },
  get time() { return time.name; },
  play() { frozen = null; last = performance.now(); syncButtons(); },
  setRoof(open) { roofGoal = roofValue = open ? 1 : 0; applyRoof(); syncButtons(); draw(); },
  resetView() { userMoved = false; resetView(); controls.update(); draw(); },
  view(azDeg, elDeg, zoom = 1) {
    userMoved = true;
    const a = THREE.MathUtils.degToRad(azDeg), e = THREE.MathUtils.degToRad(elDeg);
    camera.position.copy(target).add(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(fitDistance * zoom));
    camera.lookAt(target);
    controls.update();
    draw();
  },
};
requestAnimationFrame(frame);
