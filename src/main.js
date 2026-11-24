// Ebb & Ember floating sauna: stroked-toon diorama, draft 1.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStrokedToon } from './core/stroked-toon.js';
import { createKit, smooth } from './scene/kit.js';
import { buildEnvironment, SLAB } from './scene/environment.js';
import { buildSauna } from './scene/sauna.js';
import { buildSite } from './scene/site.js';
import { buildCast, LOOP } from './scene/cast.js';

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

// Dusk rig: low warm sun on the river side, cool sky filling the shadows.
scene.add(new THREE.HemisphereLight(0xb9c8dd, 0x6b5148, 1.75));
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

// Camera: long-lens three-quarter view of the river wall and porch.
const AZ = THREE.MathUtils.degToRad(-24);
const EL = THREE.MathUtils.degToRad(31);
const target = new THREE.Vector3(4.2, 1.0, -6.7);
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
  const fx = 0.95, fy = 0.86;
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

function resetView() {
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(dir, fitDistance);
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
  pauseBtn.textContent = frozen === null ? 'Pause' : 'Play';
  pauseBtn.setAttribute('aria-pressed', String(frozen !== null));
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

function draw() {
  evaluate(frozen ?? clock);
  look.render(scene, camera);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (frozen === null) clock = (clock + dt) % LOOP;
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
